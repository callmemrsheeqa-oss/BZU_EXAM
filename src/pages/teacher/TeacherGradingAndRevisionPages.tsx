import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, Send, AlertTriangle, CheckCircle2, FileText, Save, XCircle } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DashboardShell } from '../../components/DashboardShell';
import { StatusLabel, examStatusTone } from '../../components/StatusLabel';
import { PdfAnnotatorViewer } from '../../components/PdfAnnotatorViewer';
import { getTeacherScopedCourses } from '../../lib/permissions';
import {
  computeCombinedMarks,
  computeLetterGrade,
  validateSubjectiveScoreMap,
} from '../../lib/gradeMath';
import {
  canPublishExamResultsNow,
  canPublishSubmissionResult,
  getTeacherMarkEditMode,
  hasPendingRevisionForSubmission,
} from '../../lib/revisionPolicy';
import { formatKarachiDateTime } from '../../lib/examTimer';
import { getPdfAssetFromDb } from '../../lib/storage';
import type { StoredPdfAsset } from '../../types/domain';

export const TeacherSubmissionsCheckerPage: React.FC = () => {
  const {
    db,
    currentUser,
    saveSubmissionAnnotations,
    saveMarkingProgressDraft,
    saveInitialSubmissionMarks,
    requestMarksRevision,
    pushToast,
  } = useAppState();
  const [searchParams] = useSearchParams();

  const myCourses = useMemo(
    () => (db && currentUser?.role === 'teacher' ? getTeacherScopedCourses(currentUser, db.courses) : []),
    [db, currentUser]
  );

  const [courseFilter, setCourseFilter] = useState('all');
  const [examFilter, setExamFilter] = useState(() => searchParams.get('examId') ?? 'all');
  const [selectedSubId, setSelectedSubId] = useState<string>(() => searchParams.get('subId') ?? '');
  const [pdfAsset, setPdfAsset] = useState<StoredPdfAsset | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, number>>({});
  const [remarksDraft, setRemarksDraft] = useState('');
  const [justification, setJustification] = useState('');

  const myCourseIds = useMemo(() => new Set(myCourses.map((c) => c.id)), [myCourses]);
  const myExams = useMemo(
    () => (db ? db.exams.filter((e) => myCourseIds.has(e.courseId)) : []),
    [db, myCourseIds]
  );
  const myExamIds = useMemo(() => new Set(myExams.map((e) => e.id)), [myExams]);

  const submissions = useMemo(() => {
    if (!db) return [];
    return db.submissions.filter((s) => {
      if (!myExamIds.has(s.examId) || !s.isFinalized) return false;
      if (examFilter !== 'all' && s.examId !== examFilter) return false;
      if (courseFilter !== 'all') {
        const ex = myExams.find((e) => e.id === s.examId);
        if (ex?.courseId !== courseFilter) return false;
      }
      return true;
    });
  }, [db, myExamIds, myExams, courseFilter, examFilter]);

  const activeSub =
    submissions.find((s) => s.id === selectedSubId) ?? submissions[0] ?? null;

  useEffect(() => {
    if (!activeSub) {
      setPdfAsset(null);
      return;
    }
    setScoreDrafts({ ...activeSub.subjectiveQuestionScores });
    setRemarksDraft(activeSub.teacherRemarks ?? '');
    setJustification('');
    if (activeSub.subjectivePdfAssetId) {
      void getPdfAssetFromDb(activeSub.subjectivePdfAssetId).then(setPdfAsset);
    } else {
      setPdfAsset(null);
    }
  }, [activeSub?.id, activeSub?.initialMarksSaved, activeSub?.resultPublished]);

  if (!db || !currentUser || currentUser.role !== 'teacher') return null;

  const activeExam = activeSub ? db.exams.find((e) => e.id === activeSub.examId) : undefined;
  const activeStudent = activeSub ? db.students.find((s) => s.id === activeSub.studentId) : undefined;
  const activeQuestions = activeExam
    ? db.questions.filter((q) => activeExam.questionIds.includes(q.id)).sort((a, b) => a.order - b.order)
    : [];
  const mcqQuestions = activeQuestions.filter((q) => q.type === 'mcq');
  const subjectiveQuestions = activeQuestions.filter((q) => q.type !== 'mcq');
  const editMode = activeSub ? getTeacherMarkEditMode(activeSub) : 'initial_save';
  const hasPendingRev = activeSub
    ? hasPendingRevisionForSubmission(activeSub.id, db.revisionRequests)
    : false;

  const handleSaveProgressDraft = async () => {
    if (!activeSub) return;
    const validation = validateSubjectiveScoreMap(scoreDrafts, activeQuestions);
    if (!validation.valid) {
      pushToast('error', validation.error ?? 'Invalid marks.');
      return;
    }
    await saveMarkingProgressDraft(activeSub.id, scoreDrafts, remarksDraft);
  };

  const handleSaveMarksOrRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSub) return;

    const validation = validateSubjectiveScoreMap(scoreDrafts, activeQuestions);
    if (!validation.valid) {
      pushToast('error', validation.error ?? 'Invalid marks.');
      return;
    }

    if (editMode === 'locked_published') {
      pushToast('error', 'Published results are locked against teacher edits.');
      return;
    }

    if (editMode === 'initial_save') {
      await saveInitialSubmissionMarks(activeSub.id, scoreDrafts, remarksDraft);
      return;
    }

    // Pre-publication modification requires Admin revision request
    if (!justification.trim()) {
      pushToast('error', 'Written justification is required to request a pre-publication marks revision.');
      return;
    }
    await requestMarksRevision({
      submissionId: activeSub.id,
      proposedScores: scoreDrafts,
      proposedRemarks: remarksDraft,
      justification: justification.trim(),
    });
    setJustification('');
  };

  return (
    <DashboardShell
      title="Demo Exam Submissions & Paper Checker"
      breadcrumb="Teacher · On-Site PDF.js Overlay Grading & Revision Governance"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Submission Selector List */}
        <aside className="xl:col-span-4 space-y-3">
          <div className="space-y-2">
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setExamFilter('all');
              }}
              aria-label="Filter submissions by course"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
            >
              <option value="all">All Assigned Courses</option>
              {myCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
              ))}
            </select>

            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              aria-label="Select exam"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
            >
              <option value="all">All Exams ({myExams.length})</option>
              {myExams
                .filter((e) => courseFilter === 'all' || e.courseId === courseFilter)
                .map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.type})
                  </option>
                ))}
            </select>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 tabular-nums">
              Submitted: {submissions.length} · Finalized Marks: {submissions.filter((s) => s.initialMarksSaved).length} · Published: {submissions.filter((s) => s.resultPublished).length}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {submissions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No finalized submissions for this filter yet.</div>
            ) : (
              submissions.map((sub) => {
                const stu = db.students.find((s) => s.id === sub.studentId);
                const ex = db.exams.find((e) => e.id === sub.examId);
                const isSelected = activeSub?.id === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubId(sub.id)}
                    className={`w-full text-left p-4 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{stu?.name}</span>
                      <StatusLabel
                        tone={sub.resultPublished ? 'success' : sub.initialMarksSaved ? 'info' : 'warning'}
                        label={
                          sub.resultPublished ? 'Published' : sub.initialMarksSaved ? 'Finalized' : sub.markingDraftSavedAt ? 'Draft Saved' : 'Unchecked'
                        }
                      />
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">
                      {stu?.rollNumber} · {ex?.title}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Paper Breakdown + PDF Viewer + Subjective Marks Form */}
        <section className="xl:col-span-8 space-y-6">
          {!activeSub || !activeExam ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
              Select a student submission from the left to inspect and grade.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-slate-500">
                      {activeStudent?.rollNumber} · Receipt {activeSub.receiptCode}
                    </div>
                    <h2 className="font-display text-lg font-bold">
                      {activeStudent?.name} — {activeExam.title}
                    </h2>
                  </div>
                  <div className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                    MCQ Auto-Score: <strong>{activeSub.mcqAutoScore ?? 0}</strong> / {mcqQuestions.reduce((a, q) => a + q.points, 0)}
                  </div>
                </div>

                {hasPendingRev && (
                  <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      A marks revision request for this submission is currently <strong>PENDING Admin approval</strong>. Effective marks remain unchanged and result publication is held.
                    </span>
                  </div>
                )}

                {editMode === 'locked_published' && (
                  <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-3 text-xs flex items-center gap-2">
                    <Lock className="h-4 w-4 shrink-0" />
                    <span>
                      Result Published ({activeSub.resultPublishedAt ? formatKarachiDateTime(activeSub.resultPublishedAt) : ''}). Standard teacher mark edits are locked.
                    </span>
                  </div>
                )}
              </div>

              {/* Objective MCQ Answers & Auto-Calculated Marks Breakdown */}
              {mcqQuestions.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold">
                      Section A — Student MCQ Answers & Auto-Grading Breakdown
                    </h3>
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      MCQ Total: {activeSub.mcqAutoScore ?? 0} / {mcqQuestions.reduce((a, q) => a + q.points, 0)}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {mcqQuestions.map((q) => {
                      const chosenIdx = activeSub.mcqAnswers[q.id];
                      const correctIdx = q.correctOptionIndex;
                      const isCorrect = chosenIdx !== undefined && chosenIdx === correctIdx;
                      const chosenLabel =
                        chosenIdx !== undefined && q.options?.[chosenIdx]
                          ? q.options[chosenIdx]
                          : 'Skipped / Unanswered';
                      const correctLabel =
                        correctIdx !== undefined && q.options?.[correctIdx]
                          ? q.options[correctIdx]
                          : '—';
                      return (
                        <div key={q.id} className="py-2.5 flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              Q{q.order}: {q.prompt}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400">
                              <span>
                                Student Answer:{' '}
                                <strong className={isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                                  {chosenLabel}
                                </strong>
                              </span>
                              <span>
                                Correct Key: <strong className="text-slate-900 dark:text-slate-200">{correctLabel}</strong>
                              </span>
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-1.5 font-mono font-bold shrink-0">
                            {isCorrect ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                            )}
                            <span>{isCorrect ? q.points : 0} / {q.points}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Typed / Dictated Answers */}
              {subjectiveQuestions.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                  <h3 className="font-display text-sm font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    Section B — Typed / Voice-Dictated Subjective Responses
                  </h3>
                  {subjectiveQuestions.map((q) => (
                    <div key={q.id} className="text-xs space-y-1 border-b last:border-b-0 border-slate-200 dark:border-slate-800 pb-2">
                      <div className="font-semibold">Q{q.order}: {q.prompt}</div>
                      <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {activeSub.subjectiveTextAnswers[q.id] || 'No typed or voice-dictated text entered (inspect PDF below if uploaded).'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pdfAsset ? (
                <PdfAnnotatorViewer
                  asset={pdfAsset}
                  annotations={activeSub.annotations}
                  editable={!activeSub.resultPublished}
                  onSaveAnnotations={(next) => saveSubmissionAnnotations(activeSub.id, next)}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-xs text-slate-500">
                  No PDF was uploaded by the student for this submission.
                </div>
              )}

              {/* Question-wise Subjective Grading Form */}
              <form
                onSubmit={handleSaveMarksOrRevision}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold">
                    {editMode === 'initial_save'
                      ? 'Enter Initial Subjective Marks'
                      : editMode === 'requires_admin_revision'
                        ? 'Request Pre-Publication Marks Revision (Requires Admin Approval)'
                        : 'Published Marks (Locked)'}
                  </h3>
                </div>

                <div className="space-y-3">
                  {subjectiveQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3"
                    >
                      <div className="text-xs">
                        <div className="font-semibold">
                          Q{q.order}: {q.prompt}
                        </div>
                        <div className="text-slate-500">Max Points: {q.points}</div>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={q.points}
                        disabled={editMode === 'locked_published'}
                        value={scoreDrafts[q.id] ?? 0}
                        onChange={(e) =>
                          setScoreDrafts((prev) => ({
                            ...prev,
                            [q.id]: Number(e.target.value),
                          }))
                        }
                        aria-label={`Subjective score for question ${q.order}`}
                        className="w-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm font-mono text-right disabled:opacity-50"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Teacher Remarks</label>
                  <textarea
                    rows={2}
                    disabled={editMode === 'locked_published'}
                    value={remarksDraft}
                    onChange={(e) => setRemarksDraft(e.target.value)}
                    placeholder="Enter constructive grading remarks..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs disabled:opacity-50"
                  />
                </div>

                {editMode === 'requires_admin_revision' && (
                  <div>
                    <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                      Written Justification for Admin Revision Approval (Required)
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Explain why saved marks need to be updated (e.g., recheck of step 2 derivation)..."
                      className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 p-2.5 text-xs"
                    />
                  </div>
                )}

                {activeSub.markingDraftSavedAt && editMode === 'initial_save' && (
                  <div className="text-[11px] font-mono text-slate-500">
                    Marking draft saved locally at {formatKarachiDateTime(activeSub.markingDraftSavedAt)} (not yet finalized).
                  </div>
                )}

                {editMode !== 'locked_published' && (
                  <div className="flex flex-wrap items-center gap-3">
                    {editMode === 'initial_save' && (
                      <button
                        type="button"
                        onClick={() => void handleSaveProgressDraft()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save Marking Progress
                      </button>
                    )}
                    <button
                      type="submit"
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white ${
                        editMode === 'initial_save'
                          ? 'bg-emerald-700 hover:bg-emerald-800'
                          : 'bg-amber-600 hover:bg-amber-700'
                      }`}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {editMode === 'initial_save'
                        ? 'Finalize Initial Marks'
                        : 'Submit Revision Request to Admin'}
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </section>
      </div>
    </DashboardShell>
  );
};

export const TeacherGradebookPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'teacher') return null;
  const myCourses = getTeacherScopedCourses(currentUser, db.courses);
  const myCourseIds = new Set(myCourses.map((c) => c.id));
  const myExams = db.exams.filter((e) => myCourseIds.has(e.courseId));
  const myExamIds = new Set(myExams.map((e) => e.id));
  const subs = db.submissions.filter((s) => myExamIds.has(s.examId) && s.isFinalized);

  return (
    <DashboardShell title="Digital Gradebook / Marksheet" breadcrumb="Teacher · Combined MCQ + Subjective Summary">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-500">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Assessment</th>
                <th className="px-4 py-3 text-right">MCQ</th>
                <th className="px-4 py-3 text-right">Subjective</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Grade</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {subs.map((sub) => {
                const stu = db.students.find((s) => s.id === sub.studentId);
                const ex = db.exams.find((e) => e.id === sub.examId);
                const qs = ex ? db.questions.filter((q) => ex.questionIds.includes(q.id)) : [];
                const m = computeCombinedMarks(sub, qs);
                const g = computeLetterGrade(m.totalObtained, m.totalMax);
                return (
                  <tr key={sub.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{stu?.name}</div>
                      <div className="text-xs font-mono text-slate-500">{stu?.rollNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{ex?.title}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{m.mcq}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{m.subjective}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                      {m.totalObtained} / {m.totalMax}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{g.letter}</td>
                    <td className="px-4 py-3">
                      <StatusLabel
                        tone={sub.resultPublished ? 'success' : sub.initialMarksSaved ? 'info' : 'warning'}
                        label={sub.resultPublished ? 'Published' : sub.initialMarksSaved ? 'Ready' : 'Pending'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
};

export const TeacherRevisionRequestsPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'teacher') return null;

  const myRevs = db.revisionRequests.filter((r) => r.teacherId === currentUser.id);

  return (
    <DashboardShell title="My Marks Revision Requests" breadcrumb="Teacher · Pre-Publication Approval History">
      <div className="space-y-4">
        {myRevs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
            You have not submitted any marks revision requests yet.
          </div>
        ) : (
          myRevs.map((rev) => {
            const stu = db.students.find((s) => s.id === rev.studentId);
            const ex = db.exams.find((e) => e.id === rev.examId);
            return (
              <div
                key={rev.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs text-slate-500">
                      {rev.id} · Requested {formatKarachiDateTime(rev.requestedAt)}
                    </div>
                    <h2 className="font-display text-base font-bold">
                      {stu?.name} ({stu?.rollNumber}) — {ex?.title}
                    </h2>
                  </div>
                  <StatusLabel tone={examStatusTone(rev.status)} label={rev.status.toUpperCase()} />
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div>
                    Proposed Subjective Marks Change:{' '}
                    <span className="font-mono font-bold">
                      {rev.oldSubjectiveTotal} → {rev.proposedSubjectiveTotal}
                    </span>
                  </div>
                  <div>
                    <strong>Justification:</strong> {rev.justification}
                  </div>
                  {rev.decisionNote && (
                    <div className="text-slate-500 pt-1">
                      <strong>Admin Decision ({rev.decidedAt ? formatKarachiDateTime(rev.decidedAt) : ''}):</strong>{' '}
                      {rev.decisionNote}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </DashboardShell>
  );
};

export const TeacherResultPublisherPage: React.FC = () => {
  const { db, currentUser, publishSubmissionResults, publishExamResultsNow } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'teacher') return null;

  const myCourses = getTeacherScopedCourses(currentUser, db.courses);
  const myCourseIds = new Set(myCourses.map((c) => c.id));
  const myExams = db.exams.filter((e) => myCourseIds.has(e.courseId));
  const myExamIds = new Set(myExams.map((e) => e.id));
  const subs = db.submissions.filter((s) => myExamIds.has(s.examId) && s.isFinalized);

  return (
    <DashboardShell title="Results Publisher" breadcrumb="Teacher · Instant Demo Publication & Revision Gates">
      <div className="space-y-6">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Use <strong>Publish Demo Results Now</strong> to release results immediately once all required marking is finalized and zero Admin revision requests are pending for that exam.
        </p>

        {/* Exam-level Publish Demo Results Now Cards */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="font-display text-base font-bold">
            Exam-Level Instant Result Publication
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {myExams.map((ex) => {
              const gate = canPublishExamResultsNow(ex.id, db.submissions, db.revisionRequests);
              const c = db.courses.find((x) => x.id === ex.courseId);
              return (
                <div key={ex.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                      {c?.code} · {ex.type}
                    </div>
                    <div className="font-semibold text-sm">{ex.title}</div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums">
                      Submitted: {gate.finalizedCount} · Unchecked: {gate.ungradedCount} · Pending Revisions: {gate.pendingRevisionCount}
                    </div>
                    {!gate.allowed && gate.reason && (
                      <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                        {gate.reason}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!gate.allowed}
                    onClick={() => void publishExamResultsNow(ex.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Publish Demo Results Now
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Individual Submission Publication Rows */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
          <div className="px-4 py-3 text-xs font-semibold text-slate-500">
            Individual Student Submissions
          </div>
          {subs.map((sub) => {
            const stu = db.students.find((s) => s.id === sub.studentId);
            const ex = db.exams.find((e) => e.id === sub.examId);
            const qs = ex ? db.questions.filter((q) => ex.questionIds.includes(q.id)) : [];
            const marks = computeCombinedMarks(sub, qs);
            const gate = canPublishSubmissionResult(sub, db.revisionRequests);

            return (
              <div key={sub.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm">
                    {stu?.name} ({stu?.rollNumber}) · {ex?.title}
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    Combined: {marks.totalObtained} / {marks.totalMax} (MCQ {marks.mcq} + Subj {marks.subjective})
                  </div>
                  {!gate.allowed && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">
                      {gate.reason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {sub.resultPublished ? (
                    <StatusLabel tone="success" label="Published & Locked" />
                  ) : (
                    <button
                      type="button"
                      disabled={!gate.allowed || !sub.initialMarksSaved}
                      onClick={() => void publishSubmissionResults([sub.id])}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {!sub.initialMarksSaved ? 'Grade First' : 'Publish Result'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </DashboardShell>
  );
};
