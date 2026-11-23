import React, { useEffect, useState } from 'react';
import { FileUp, Lock, Eye, CheckCircle2 } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DashboardShell } from '../../components/DashboardShell';
import { StatusLabel, examStatusTone } from '../../components/StatusLabel';
import { PdfAnnotatorViewer } from '../../components/PdfAnnotatorViewer';
import { deriveAssignmentStatus, formatKarachiDateTime } from '../../lib/examTimer';
import { computeCombinedMarks, computeLetterGrade } from '../../lib/gradeMath';
import { canStudentViewCheckedPaper } from '../../lib/permissions';
import { fileToBase64 } from '../../lib/pdfUtils';
import { getPdfAssetFromDb } from '../../lib/storage';
import type { StoredPdfAsset } from '../../types/domain';

export const StudentProfilePage: React.FC = () => {
  const { db, currentUser } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'student') return null;
  const dept = db.departments.find((d) => d.id === currentUser.departmentId);
  const program = db.programs.find((p) => p.id === currentUser.programId);

  return (
    <DashboardShell title="My Profile" breadcrumb="Student · Synthetic Academic Identity">
      <div className="max-w-3xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
            style={{ backgroundColor: currentUser.avatarColor }}
          >
            {currentUser.avatarInitials}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{currentUser.name}</h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {currentUser.email} · DEMO / SYNTHETIC RECORD
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t border-slate-200 dark:border-slate-800 pt-4">
          <div>
            <dt className="text-xs text-slate-500">Student ID</dt>
            <dd className="font-mono font-semibold">{currentUser.studentId}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Roll Number</dt>
            <dd className="font-mono font-semibold">{currentUser.rollNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Registration Number</dt>
            <dd className="font-mono font-semibold">{currentUser.registrationNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Department</dt>
            <dd className="font-semibold">{dept?.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Degree Program</dt>
            <dd className="font-semibold">{program?.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Batch & Completion</dt>
            <dd className="font-mono">
              {currentUser.batch} (Admitted {currentUser.admissionYear}, Expected {currentUser.expectedCompletionYear})
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Current Semester & Section</dt>
            <dd className="font-semibold">Semester {currentUser.semester} · Section {currentUser.section}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Mock CGPA (Synthetic)</dt>
            <dd className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {currentUser.cgpa.toFixed(2)} / 4.00
            </dd>
          </div>
        </dl>
      </div>
    </DashboardShell>
  );
};

export const StudentCoursesAndProgressPage: React.FC<{ mode: 'courses' | 'progress' }> = ({ mode }) => {
  const { db, currentUser } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'student') return null;

  const enrolled = db.courses.filter((c) => currentUser.enrolledCourseIds.includes(c.id));
  const completed = currentUser.academicHistory.filter((h) => h.status === 'completed');
  const planned = currentUser.academicHistory.filter((h) => h.status === 'planned');

  return (
    <DashboardShell
      title={mode === 'courses' ? 'Enrolled Courses' : 'Academic Progress & Study Plan'}
      breadcrumb="Student · Fictional Transcript Summary (Not Official BZU Transcript)"
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="font-display text-base font-bold">
            Current Enrolled Courses (Semester {currentUser.semester})
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {enrolled.map((c) => {
              const teacher = db.teachers.find((t) => t.id === c.teacherId);
              return (
                <div key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 mr-2">
                      {c.code}
                    </span>
                    <span className="font-semibold">{c.title}</span>
                    <div className="text-xs text-slate-500">
                      Instructor: {teacher?.name} · Section {c.section}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                    {c.creditHours} Credit Hours
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Completed Subjects (Synthetic History)</h2>
            <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Mock CGPA: {currentUser.cgpa.toFixed(2)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Course Title</th>
                  <th className="py-2 pr-4">Semester</th>
                  <th className="py-2 pr-4">Credits</th>
                  <th className="py-2 text-right">Mock Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {completed.map((rec) => (
                  <tr key={rec.courseCode}>
                    <td className="py-2.5 pr-4 font-mono text-xs">{rec.courseCode}</td>
                    <td className="py-2.5 pr-4">{rec.courseTitle}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">Sem {rec.semesterNumber}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{rec.creditHours}</td>
                    <td className="py-2.5 text-right font-mono font-bold">
                      {rec.grade} ({rec.gradePoints?.toFixed(1)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="font-display text-base font-bold">Planned Future-Semester Subjects</h2>
          {planned.map((p) => (
            <div key={p.courseCode} className="text-sm flex justify-between py-2">
              <span>
                <span className="font-mono text-slate-500 mr-2">{p.courseCode}</span>
                {p.courseTitle}
              </span>
              <span className="font-mono text-xs text-slate-500">
                Semester {p.semesterNumber} · {p.creditHours} Cr
              </span>
            </div>
          ))}
        </section>
      </div>
    </DashboardShell>
  );
};

export const StudentSubmissionsPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'student') return null;

  const mySubs = db.submissions.filter((s) => s.studentId === currentUser.id);

  return (
    <DashboardShell title="My Submissions" breadcrumb="Student · Exam Attempts & Receipts">
      <div className="space-y-4">
        {mySubs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
            You have not started or submitted any exam attempts yet.
          </div>
        ) : (
          mySubs.map((sub) => {
            const exam = db.exams.find((e) => e.id === sub.examId);
            return (
              <div
                key={sub.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold">{exam?.title ?? sub.examId}</h3>
                    <div className="text-xs font-mono text-slate-500">
                      Receipt: {sub.receiptCode ?? 'Draft in progress'} · Submitted:{' '}
                      {sub.submittedAt ? formatKarachiDateTime(sub.submittedAt) : 'Not finalized'}
                    </div>
                  </div>
                  <StatusLabel
                    tone={sub.resultPublished ? 'success' : sub.isFinalized ? 'info' : 'warning'}
                    label={
                      sub.resultPublished
                        ? 'Result Published'
                        : sub.isFinalized
                          ? 'Submitted / Under Review'
                          : 'Draft In Progress'
                    }
                  />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-4">
                  <span>MCQs answered: {Object.keys(sub.mcqAnswers).length}</span>
                  <span>PDF attachment: {sub.subjectivePdfFileName ?? 'None'}</span>
                  <span>Focus incidents logged: {sub.incidents.length}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </DashboardShell>
  );
};

export const StudentAssignmentsPage: React.FC = () => {
  const { db, currentUser, submitAssignmentResponse, pushToast } = useAppState();
  const [textDrafts, setTextDrafts] = useState<Record<string, string>>({});
  const [pdfFiles, setPdfFiles] = useState<Record<string, File | undefined>>({});

  if (!db || !currentUser || currentUser.role !== 'student') return null;

  const assignments = db.assignments.filter((a) =>
    currentUser.enrolledCourseIds.includes(a.courseId)
  );

  const handleSubmit = async (assignmentId: string) => {
    const text = textDrafts[assignmentId]?.trim() ?? '';
    const file = pdfFiles[assignmentId];
    if (!text && !file) {
      pushToast('error', 'Enter a text response or attach a PDF file before submitting.');
      return;
    }
    let asset: StoredPdfAsset | undefined;
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        pushToast('error', 'Only PDF files are accepted.');
        return;
      }
      const base64Data = await fileToBase64(file);
      asset = {
        id: `asg-pdf-${assignmentId}-${currentUser.id}`,
        fileName: file.name,
        mimeType: 'application/pdf',
        sizeBytes: file.size,
        base64Data,
        createdAt: new Date().toISOString(),
      };
    }
    await submitAssignmentResponse(assignmentId, text || 'Submitted PDF attachment.', asset);
  };

  return (
    <DashboardShell title="Assignments" breadcrumb="Student · Coursework Deadlines">
      <div className="space-y-4">
        {assignments.map((asg) => {
          const course = db.courses.find((c) => c.id === asg.courseId);
          const sub = db.assignmentSubmissions.find(
            (s) => s.assignmentId === asg.id && s.studentId === currentUser.id
          );
          const status = deriveAssignmentStatus(asg, sub);
          const isOpen = status === 'Open';

          return (
            <div
              key={asg.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">
                    {course?.code} · {asg.isDemoSlotLabel}
                  </div>
                  <h3 className="font-display text-base font-bold">{asg.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{asg.instructions}</p>
                  <div className="text-xs font-mono text-slate-500 mt-1">
                    Due: {formatKarachiDateTime(asg.dueAt)} · {asg.totalMarks} Marks
                  </div>
                </div>
                <StatusLabel tone={examStatusTone(status)} label={status} />
              </div>

              {sub ? (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs space-y-1">
                  <div className="font-semibold inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Submitted {sub.submittedAt ? formatKarachiDateTime(sub.submittedAt) : ''}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{sub.textResponse}</p>
                  {typeof sub.marksObtained === 'number' && (
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100 pt-1">
                      Graded: {sub.marksObtained} / {asg.totalMarks} · {sub.teacherFeedback}
                    </div>
                  )}
                </div>
              ) : isOpen ? (
                <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <textarea
                    rows={3}
                    value={textDrafts[asg.id] ?? ''}
                    onChange={(e) =>
                      setTextDrafts((prev) => ({ ...prev, [asg.id]: e.target.value }))
                    }
                    placeholder="Type assignment response or notes..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium cursor-pointer">
                      <FileUp className="h-3.5 w-3.5" />
                      <span>{pdfFiles[asg.id]?.name ?? 'Attach PDF (Optional)'}</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) =>
                          setPdfFiles((prev) => ({ ...prev, [asg.id]: e.target.files?.[0] }))
                        }
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSubmit(asg.id)}
                      className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Submit Assignment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-red-700 dark:text-red-400 font-medium">
                  Assignment deadline has passed. Submissions are locked.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
};

export const StudentResultsPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  const [selectedPdfSubId, setSelectedPdfSubId] = useState<string | null>(null);
  const [loadedAsset, setLoadedAsset] = useState<StoredPdfAsset | null>(null);

  const publishedSubs =
    db && currentUser
      ? db.submissions.filter((s) => s.studentId === currentUser.id && s.resultPublished)
      : [];

  useEffect(() => {
    if (!selectedPdfSubId || !db) {
      setLoadedAsset(null);
      return;
    }
    const sub = db.submissions.find((s) => s.id === selectedPdfSubId);
    if (!sub?.subjectivePdfAssetId) {
      setLoadedAsset(null);
      return;
    }
    void getPdfAssetFromDb(sub.subjectivePdfAssetId).then(setLoadedAsset);
  }, [selectedPdfSubId, db]);

  if (!db || !currentUser || currentUser.role !== 'student') return null;

  return (
    <DashboardShell title="Published Results" breadcrumb="Student · Combined MCQ + Subjective Grades (Synthetic)">
      <div className="space-y-6">
        {publishedSubs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
            No results have been published for your account yet. MCQ scores remain hidden until publication.
          </div>
        ) : (
          publishedSubs.map((sub) => {
            const exam = db.exams.find((e) => e.id === sub.examId);
            const course = exam ? db.courses.find((c) => c.id === exam.courseId) : undefined;
            const questions = exam ? db.questions.filter((q) => exam.questionIds.includes(q.id)) : [];
            const marks = computeCombinedMarks(sub, questions);
            const grade = computeLetterGrade(marks.totalObtained, marks.totalMax);
            const checkedPaperAllowed = canStudentViewCheckedPaper(currentUser.id, sub, db.policy);

            return (
              <div
                key={sub.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-slate-500">
                      {course?.code} · Published {sub.resultPublishedAt ? formatKarachiDateTime(sub.resultPublishedAt) : ''}
                    </div>
                    <h2 className="font-display text-lg font-bold">{exam?.title}</h2>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {marks.totalObtained} / {marks.totalMax}
                    </div>
                    <div className="text-xs text-slate-500">
                      {grade.percentage}% · Grade {grade.letter} ({db.policy.gradeScaleLabel})
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-slate-200 dark:border-slate-800 py-3 text-xs">
                  <div>
                    <span className="text-slate-500">Auto-Graded MCQs:</span>{' '}
                    <strong className="font-mono">{marks.mcq}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Subjective Marks:</span>{' '}
                    <strong className="font-mono">{marks.subjective}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Teacher Remarks:</span>{' '}
                    <span>{sub.teacherRemarks || '—'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  {checkedPaperAllowed ? (
                    sub.subjectivePdfAssetId ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPdfSubId(selectedPdfSubId === sub.id ? null : sub.id)
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        <Eye className="h-4 w-4" />
                        {selectedPdfSubId === sub.id
                          ? 'Hide Checked Annotated Paper'
                          : 'View Checked Annotated PDF'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">No PDF was attached for this attempt.</span>
                    )
                  ) : (
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                      <Lock className="h-4 w-4" />
                      Checked annotated PDF viewing is currently disabled by Admin Visibility Policy.
                    </div>
                  )}
                </div>

                {selectedPdfSubId === sub.id && checkedPaperAllowed && loadedAsset && (
                  <div className="pt-2">
                    <PdfAnnotatorViewer
                      asset={loadedAsset}
                      annotations={sub.annotations}
                      editable={false}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </DashboardShell>
  );
};
