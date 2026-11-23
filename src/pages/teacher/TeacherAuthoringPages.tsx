import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileUp, Plus, AlertTriangle, Eye, CheckCircle2, Info, Play, Rocket } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DashboardShell } from '../../components/DashboardShell';
import { getTeacherScopedCourses } from '../../lib/permissions';
import { computeDemoExamWindow } from '../../lib/revisionPolicy';
import {
  extractTextFromDocxFile,
  extractTextFromPdfFile,
  parseQuestionDraftsFromText,
} from '../../lib/pdfUtils';
import {
  isDateWithinOfficialWindow,
  type AcademicSemesterId,
} from '../../data/bzuAcademicCalendar';
import type { Exam, ExamType, QuestionItem, QuestionType } from '../../types/domain';

const MATH_SYMBOLS = ['∑', '∫', '√', 'π', '∀', '∃', '≤', '≥', '≠', '∈', 'ℝ', 'ℕ', '′', '″', '→'];

export const TeacherQuestionBankPage: React.FC = () => {
  const { db, currentUser, saveQuestion, saveManyQuestions, pushToast } = useAppState();

  const myCourses = useMemo(
    () => (db && currentUser?.role === 'teacher' ? getTeacherScopedCourses(currentUser, db.courses) : []),
    [db, currentUser]
  );

  const [courseId, setCourseId] = useState(myCourses[0]?.id ?? 'crs-math-301');
  const [sectionTitle, setSectionTitle] = useState('Section A — Objective');
  const [qType, setQType] = useState<QuestionType>('mcq');
  const [prompt, setPrompt] = useState('');
  const [points, setPoints] = useState(2);
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState(0);

  // Import state
  const [importDrafts, setImportDrafts] = useState<QuestionItem[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [structuredText, setStructuredText] = useState('');

  if (!db || !currentUser || currentUser.role !== 'teacher') return null;

  const myCourseIds = new Set(myCourses.map((c) => c.id));
  const bankQuestions = db.questions.filter((q) => myCourseIds.has(q.courseId));

  const handleAddManualQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      pushToast('error', 'Question prompt cannot be empty.');
      return;
    }
    const q: QuestionItem = {
      id: `q-${Date.now()}`,
      courseId,
      sectionTitle: sectionTitle.trim() || 'Section A',
      type: qType,
      prompt: prompt.trim(),
      points: Math.max(1, points),
      order: bankQuestions.length + 1,
      options: qType === 'mcq' ? options.map((o, i) => o.trim() || `Option ${i + 1}`) : undefined,
      correctOptionIndex: qType === 'mcq' ? correctIdx : undefined,
      createdByTeacherId: currentUser.id,
    };
    await saveQuestion(q);
    setPrompt('');
    setOptions(['', '', '', '']);
    pushToast('success', 'Added question to Question Bank.');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportWarnings([]);
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.docx')) {
        const { text, warnings } = await extractTextFromDocxFile(file);
        const drafts = parseQuestionDraftsFromText(text, courseId, currentUser.id);
        setImportDrafts(drafts);
        setImportWarnings([
          ...warnings,
          'DOCX text extracted via Mammoth. Verify question types, marks, and math notation before saving.',
        ]);
      } else if (lower.endsWith('.pdf')) {
        const { text, pageCount, warnings } = await extractTextFromPdfFile(file);
        const drafts = parseQuestionDraftsFromText(text, courseId, currentUser.id);
        setImportDrafts(drafts);
        setImportWarnings([
          `Processed ${pageCount} PDF page(s) via PDF.js.`,
          ...warnings,
        ]);
      } else if (lower.endsWith('.json') || lower.endsWith('.txt')) {
        const txt = await file.text();
        const drafts = parseQuestionDraftsFromText(txt, courseId, currentUser.id);
        setImportDrafts(drafts);
        setImportWarnings(['Parsed structured JSON/text export. Review answer keys before saving.']);
      } else {
        pushToast('error', 'Unsupported format. Choose .pdf, .docx, .json, or .txt.');
      }
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'File extraction failed.');
    } finally {
      setImporting(false);
    }
  };

  const handleParsePasted = () => {
    const drafts = parseQuestionDraftsFromText(structuredText, courseId, currentUser.id);
    if (drafts.length === 0) {
      pushToast('error', 'Could not parse any questions. Use numbered lines or JSON format.');
      return;
    }
    setImportDrafts(drafts);
    setImportWarnings(['Parsed pasted text / authorized export. Review before saving to Question Bank.']);
  };

  const handleSaveImportDrafts = async () => {
    if (importDrafts.length === 0) return;
    await saveManyQuestions(importDrafts);
    setImportDrafts([]);
    setImportWarnings([]);
    setStructuredText('');
    pushToast('success', `Saved ${importDrafts.length} reviewed question(s) to Question Bank.`);
  };

  return (
    <DashboardShell title="Question Bank & Document Import" breadcrumb="Teacher · Authoring & Extraction">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Manual Question Editor */}
          <form
            onSubmit={handleAddManualQuestion}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
          >
            <h2 className="font-display text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Create Question Manually
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                aria-label="Target Course"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              >
                {myCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code}</option>
                ))}
              </select>
              <select
                value={qType}
                onChange={(e) => setQType(e.target.value as QuestionType)}
                aria-label="Question Type"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              >
                <option value="mcq">MCQ (Auto-graded)</option>
                <option value="short">Short Answer</option>
                <option value="long">Long Answer</option>
              </select>
              <input
                type="number"
                min={1}
                max={50}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                aria-label="Marks"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
              />
            </div>

            <input
              type="text"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="Section title (e.g., Section A — Objective)"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
            />

            <div>
              <div className="flex flex-wrap items-center gap-1 mb-1.5">
                <span className="text-[11px] text-slate-500 mr-1">Math Symbols:</span>
                {MATH_SYMBOLS.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setPrompt((p) => p + sym)}
                    className="rounded border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {sym}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter question prompt (Unicode math supported)..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-sm"
              />
            </div>

            {qType === 'mcq' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Options (Select Correct Key)
                </div>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct-opt"
                      checked={correctIdx === idx}
                      onChange={() => setCorrectIdx(idx)}
                      aria-label={`Mark option ${idx + 1} as correct`}
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) =>
                        setOptions((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                      }
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Save to Question Bank
            </button>
          </form>

          {/* PDF / DOCX / Google Forms Structured Import */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h2 className="font-display text-base font-bold flex items-center gap-2">
              <FileUp className="h-4 w-4 text-amber-600" />
              Import Questions (PDF / DOCX / JSON Export)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Extracts text client-side using <strong>PDF.js</strong> (.pdf) or <strong>Mammoth</strong> (.docx) into an editable draft list. Raw PDFs are not auto-graded exams; scanned images or complex equations require manual correction.
            </p>

            <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-4 py-3 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 w-full justify-center">
              <FileUp className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>{importing ? 'Extracting...' : 'Choose .PDF, .DOCX, or .JSON File'}</span>
              <input
                type="file"
                accept=".pdf,.docx,.json,.txt"
                disabled={importing}
                onChange={handleImportFile}
                className="sr-only"
              />
            </label>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
              <div className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Info className="h-3.5 w-3.5 text-amber-600" />
                Google Forms / Authorized Export Helper
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct scraping of private Google Forms URLs is not possible in browser-only mode. Paste an authorized JSON export or numbered question list below:
              </p>
              <textarea
                rows={3}
                value={structuredText}
                onChange={(e) => setStructuredText(e.target.value)}
                placeholder={'1. What is the limit of 1/n as n -> ∞?\nA) 0\nB) 1\nC) ∞\nD) Undefined'}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleParsePasted}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Parse Text into Draft Questions
              </button>
            </div>
          </div>
        </div>

        {/* Review Extracted Drafts */}
        {importDrafts.length > 0 && (
          <section className="rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold">
                Review Extracted Draft Questions ({importDrafts.length})
              </h3>
              <button
                type="button"
                onClick={handleSaveImportDrafts}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Confirm & Save All to Question Bank
              </button>
            </div>

            {importWarnings.map((w, i) => (
              <div key={i} className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}

            <div className="space-y-3">
              {importDrafts.map((dq, idx) => (
                <div key={dq.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="font-mono text-xs font-bold">#{idx + 1}</span>
                    <select
                      value={dq.type}
                      onChange={(e) =>
                        setImportDrafts((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, type: e.target.value as QuestionType } : item
                          )
                        )
                      }
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs"
                    >
                      <option value="mcq">MCQ</option>
                      <option value="short">Short</option>
                      <option value="long">Long</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={dq.points}
                      onChange={(e) =>
                        setImportDrafts((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, points: Number(e.target.value) } : item
                          )
                        )
                      }
                      className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <input
                    type="text"
                    value={dq.prompt}
                    onChange={(e) =>
                      setImportDrafts((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, prompt: e.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Existing Question Bank List */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="font-display text-base font-bold">
            Course Question Bank ({bankQuestions.length} Items)
          </h3>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {bankQuestions.map((q) => {
              const c = myCourses.find((x) => x.id === q.courseId);
              return (
                <div key={q.id} className="py-3 flex flex-wrap items-start justify-between gap-3 text-sm">
                  <div>
                    <div className="text-xs font-mono text-slate-500">
                      {c?.code} · {q.sectionTitle} · {q.type.toUpperCase()} · {q.points} pts
                    </div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                      {q.prompt}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
};

export const TeacherExamBuilderPage: React.FC = () => {
  const {
    db,
    currentUser,
    createOrUpdateExam,
    startDemoExamNow,
    saveQuestion,
    saveManyQuestions,
    pushToast,
  } = useAppState();
  const [searchParams] = useSearchParams();
  const initialDemoMode = searchParams.get('demo') === '1';

  const myCourses = useMemo(
    () => (db && currentUser?.role === 'teacher' ? getTeacherScopedCourses(currentUser, db.courses) : []),
    [db, currentUser]
  );

  const [courseId, setCourseId] = useState(myCourses[0]?.id ?? 'crs-math-301');
  const [sectionLabel, setSectionLabel] = useState(myCourses[0]?.section ?? 'A');
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState<ExamType>('Midterm');
  const [semesterRef, setSemesterRef] = useState<'fall-2026' | 'spring-2027' | 'summer-2027' | 'sandbox'>(
    initialDemoMode ? 'sandbox' : 'fall-2026'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [instructions, setInstructions] = useState('Read all questions carefully. Fixed wall-clock window applies.');
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);
  const [strictMode, setStrictMode] = useState(false);
  const [strictThreshold, setStrictThreshold] = useState(3);
  const [previewMode, setPreviewMode] = useState(false);

  // Inline Quick Question Authoring & Extraction inside Exam Builder
  const [quickOpen, setQuickOpen] = useState(false);
  const [qType, setQType] = useState<QuestionType>('mcq');
  const [qPrompt, setQPrompt] = useState('');
  const [qPoints, setQPoints] = useState(5);
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrectIdx, setQCorrectIdx] = useState(0);
  const [extractingDoc, setExtractingDoc] = useState(false);
  const [docDrafts, setDocDrafts] = useState<QuestionItem[]>([]);

  if (!db || !currentUser || currentUser.role !== 'teacher') return null;

  const courseQuestions = db.questions.filter((q) => q.courseId === courseId);
  const selectedCourse = myCourses.find((c) => c.id === courseId);

  const windowCheck =
    semesterRef !== 'sandbox' && (examType === 'Midterm' || examType === 'Final Term')
      ? isDateWithinOfficialWindow(startDate, semesterRef as AcademicSemesterId, examType)
      : { valid: true, windowLabel: 'Demo flexible window (official BZU schedule preserved)' };

  const totalMarks = courseQuestions
    .filter((q) => selectedQIds.includes(q.id))
    .reduce((acc, q) => acc + q.points, 0);

  const handleSemesterPreset = (sem: typeof semesterRef) => {
    setSemesterRef(sem);
    if (sem === 'fall-2026') {
      setStartDate(examType === 'Final Term' ? '2027-01-05' : '2026-10-20');
    } else if (sem === 'spring-2027') {
      setStartDate(examType === 'Final Term' ? '2027-06-05' : '2027-03-26');
    } else if (sem === 'summer-2027') {
      setStartDate(examType === 'Final Term' ? '2027-08-23' : '2027-07-21');
    } else {
      setStartDate(new Date().toISOString().slice(0, 10));
    }
  };

  const handleQuickAddQuestion = async () => {
    if (!qPrompt.trim()) {
      pushToast('error', 'Enter a question prompt first.');
      return;
    }
    const newQ: QuestionItem = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      courseId,
      sectionTitle: qType === 'mcq' ? 'Section A — Objective' : 'Section B — Subjective',
      type: qType,
      prompt: qPrompt.trim(),
      points: Math.max(1, qPoints),
      order: courseQuestions.length + 1,
      options: qType === 'mcq' ? qOptions.map((o, i) => o.trim() || `Option ${i + 1}`) : undefined,
      correctOptionIndex: qType === 'mcq' ? qCorrectIdx : undefined,
      createdByTeacherId: currentUser.id,
    };
    await saveQuestion(newQ);
    setSelectedQIds((prev) => [...prev, newQ.id]);
    setQPrompt('');
    setQOptions(['', '', '', '']);
    pushToast('success', 'Question added and selected for this exam.');
  };

  const handleExtractFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingDoc(true);
    try {
      const lower = file.name.toLowerCase();
      let text = '';
      if (lower.endsWith('.docx')) {
        const res = await extractTextFromDocxFile(file);
        text = res.text;
      } else if (lower.endsWith('.pdf')) {
        const res = await extractTextFromPdfFile(file);
        text = res.text;
      } else {
        text = await file.text();
      }
      const drafts = parseQuestionDraftsFromText(text, courseId, currentUser.id);
      if (drafts.length === 0) {
        pushToast('warning', 'No structured questions found in document.');
      } else {
        setDocDrafts(drafts);
        pushToast('info', `Extracted ${drafts.length} editable draft question(s).`);
      }
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Extraction failed.');
    } finally {
      setExtractingDoc(false);
    }
  };

  const handleAcceptExtractedDrafts = async () => {
    if (docDrafts.length === 0) return;
    await saveManyQuestions(docDrafts);
    setSelectedQIds((prev) => [...prev, ...docDrafts.map((d) => d.id)]);
    setDocDrafts([]);
    pushToast('success', 'Imported questions added to Question Bank & selected for this exam.');
  };

  const handleBuildExam = async (mode: 'draft' | 'publish' | 'start_now') => {
    if (!title.trim()) {
      pushToast('error', 'Enter an assessment title.');
      return;
    }
    if (selectedQIds.length === 0) {
      pushToast('error', 'Select at least one question from the course bank (or add one above).');
      return;
    }

    const isDemo = mode === 'start_now' || semesterRef === 'sandbox';
    const demoWin = computeDemoExamWindow(Date.now(), durationMinutes);
    const startAt =
      mode === 'start_now'
        ? demoWin.startAt
        : new Date(`${startDate}T${startTime}:00+05:00`).toISOString();
    const endAt =
      mode === 'start_now'
        ? demoWin.endAt
        : isDemo
          ? new Date(Date.parse(startAt) + Math.max(5, durationMinutes) * 60 * 1000).toISOString()
          : new Date(`${startDate}T${endTime}:00+05:00`).toISOString();

    if (Date.parse(endAt) <= Date.parse(startAt)) {
      pushToast('error', 'End time must be after start time.');
      return;
    }

    const examId = `exam-${Date.now()}`;
    const exam: Exam = {
      id: examId,
      title: title.trim(),
      courseId,
      section: sectionLabel.trim() || selectedCourse?.section || 'A',
      type: examType,
      instructions,
      totalMarks,
      startAt,
      endAt,
      publishAt: new Date(Date.parse(endAt) + 24 * 60 * 60 * 1000).toISOString(),
      isPublishedToStudents: mode === 'publish' || mode === 'start_now',
      isInteractiveSandbox: isDemo,
      isDemoExam: isDemo,
      durationMinutes: isDemo ? Math.max(1, durationMinutes) : undefined,
      isDemoSlotLabel:
        mode === 'start_now'
          ? `Demo exam active now (${demoWin.durationMinutes} min · independent of official BZU calendar)`
          : 'Demo exam slot — not an official BZU date sheet',
      semesterCalendarRef: isDemo ? 'sandbox' : semesterRef,
      questionIds: selectedQIds,
      integrity: {
        warnOnTabSwitch: true,
        strictModeEnabled: strictMode,
        strictWarningThreshold: strictThreshold,
      },
      createdByTeacherId: currentUser.id,
      rescheduleHistory: [],
    };
    await createOrUpdateExam(exam);
    if (mode === 'start_now') {
      await startDemoExamNow(examId, durationMinutes);
    }
    setTitle('');
    setSelectedQIds([]);
    setPreviewMode(false);
  };

  return (
    <DashboardShell
      title={semesterRef === 'sandbox' ? 'Create Demo Exam (Interactive Testing)' : 'Exam Builder (Draft → Preview → Publish)'}
      breadcrumb="Teacher · Course Assessment Authoring"
    >
      <div className="max-w-4xl space-y-6">
        {semesterRef === 'sandbox' && (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-medium">
              <Rocket className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <span>
                <strong>Demo Exam Mode Enabled:</strong> Configure duration and click <strong>Start Demo Exam Now</strong> to make this paper immediately available to enrolled demo students regardless of official university dates.
              </span>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Assigned Course</label>
              <select
                value={courseId}
                onChange={(e) => {
                  const nextCourse = myCourses.find((c) => c.id === e.target.value);
                  setCourseId(e.target.value);
                  setSectionLabel(nextCourse?.section ?? 'A');
                  setSelectedQIds([]);
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              >
                {myCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Eligible Class / Section</label>
              <input
                type="text"
                value={sectionLabel}
                onChange={(e) => setSectionLabel(e.target.value)}
                placeholder="e.g., A (BS Sem 5)"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Assessment Type</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              >
                {['Midterm', 'Final Term', 'Quiz', 'Class Test'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Exam Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., MATH-301 Live Interactive Demo Exam"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          {/* Official Calendar Window Alignment OR Demo Exam Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Schedule / Demo Mode</label>
              <select
                value={semesterRef}
                onChange={(e) => handleSemesterPreset(e.target.value as typeof semesterRef)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              >
                <option value="sandbox">Interactive Demo Exam (Anytime)</option>
                <option value="fall-2026">Fall 2026 (Official Window)</option>
                <option value="spring-2027">Spring 2027 (Official Window)</option>
                <option value="summer-2027">Summer 2027 (Official Window)</option>
              </select>
            </div>

            {semesterRef === 'sandbox' ? (
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold mb-1">
                  Configured Exam Duration (Minutes)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Countdown timer runs for {Math.max(1, durationMinutes)} min from launch when using Start Demo Exam Now.
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1">Date (Asia/Karachi)</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Start Hour (Demo time)</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">End Hour (Demo time)</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
                  />
                </div>
              </>
            )}
          </div>

          {!windowCheck.valid && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Gentle Warning: Selected date ({startDate}) falls outside the official BZU {semesterRef.toUpperCase()} {examType} window ({windowCheck.windowLabel}). Switch to "Interactive Demo Exam" to run tests anytime without touching official dates.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">Instructions</label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
            <label className="inline-flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={strictMode}
                onChange={(e) => setStrictMode(e.target.checked)}
              />
              Enable Strict Demo Integrity Threshold (auto-finalize after N tab switches)
            </label>
            {strictMode && (
              <label className="inline-flex items-center gap-2">
                <span>Threshold:</span>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={strictThreshold}
                  onChange={(e) => setStrictThreshold(Number(e.target.value))}
                  className="w-16 rounded border border-slate-300 dark:border-slate-700 px-2 py-1 font-mono"
                />
              </label>
            )}
          </div>
        </div>

        {/* Inline Quick-Add Questions & PDF/DOCX Import */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold">
                Add New Questions or Import from PDF / Word (.docx)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quickly create MCQs, short, or long questions or extract questions from a document directly into this exam.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <FileUp className="h-3.5 w-3.5 text-amber-600" />
                <span>{extractingDoc ? 'Extracting...' : 'Import PDF / DOCX'}</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.json,.txt"
                  disabled={extractingDoc}
                  onChange={handleExtractFromFile}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={() => setQuickOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                {quickOpen ? 'Hide Quick Question Form' : 'Add Custom Question'}
              </button>
            </div>
          </div>

          {quickOpen && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as QuestionType)}
                  aria-label="New Question Type"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                >
                  <option value="mcq">MCQ (Auto-graded)</option>
                  <option value="short">Short Answer (Subjective)</option>
                  <option value="long">Long Answer (Subjective)</option>
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Marks:</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={qPoints}
                    onChange={(e) => setQPoints(Number(e.target.value))}
                    className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
              <textarea
                rows={2}
                value={qPrompt}
                onChange={(e) => setQPrompt(e.target.value)}
                placeholder="Enter question text..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs"
              />
              {qType === 'mcq' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {qOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="quick-mcq-correct"
                        checked={qCorrectIdx === idx}
                        onChange={() => setQCorrectIdx(idx)}
                        aria-label={`Correct option ${idx + 1}`}
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) =>
                          setQOptions((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                        }
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => void handleQuickAddQuestion()}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Save & Select Question
              </button>
            </div>
          )}

          {docDrafts.length > 0 && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold">Extracted Drafts ({docDrafts.length})</span>
                <button
                  type="button"
                  onClick={() => void handleAcceptExtractedDrafts()}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white"
                >
                  Accept & Add to Exam
                </button>
              </div>
              {docDrafts.map((d, i) => (
                <div key={d.id} className="truncate text-slate-700 dark:text-slate-300">
                  #{i + 1} [{d.type.toUpperCase()} · {d.points} pts]: {d.prompt}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Select Questions & Configure Question Marks */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold">
              Select Questions & Marks ({selectedQIds.length} selected · {totalMarks} Total Marks)
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedQIds(courseQuestions.map((q) => q.id))}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium"
              >
                Select All ({courseQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold"
              >
                <Eye className="h-3.5 w-3.5" />
                {previewMode ? 'Edit Selection' : 'Preview Paper'}
              </button>
            </div>
          </div>

          {!previewMode ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {courseQuestions.map((q) => {
                const checked = selectedQIds.includes(q.id);
                return (
                  <div key={q.id} className="py-3 flex items-start justify-between gap-3 text-sm">
                    <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedQIds((prev) =>
                            checked ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                          )
                        }
                        className="mt-1 accent-emerald-700"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-slate-500">
                          {q.type.toUpperCase()} · {q.sectionTitle}
                        </div>
                        <div className="font-medium">{q.prompt}</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-1.5 shrink-0 text-xs">
                      <span className="text-slate-500">Marks:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={q.points}
                        onChange={(e) =>
                          void saveQuestion({
                            ...q,
                            points: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        aria-label={`Configure marks for ${q.prompt}`}
                        className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs font-mono text-right"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
              <div className="font-display font-bold">{title || 'Untitled Assessment'}</div>
              <div className="text-xs text-slate-500">{instructions}</div>
              {courseQuestions
                .filter((q) => selectedQIds.includes(q.id))
                .map((q, idx) => (
                  <div key={q.id} className="text-xs border-t border-slate-200 dark:border-slate-800 pt-2">
                    <strong>Q{idx + 1} ({q.points} pts):</strong> {q.prompt}
                  </div>
                ))}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => void handleBuildExam('draft')}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => void handleBuildExam('publish')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 text-emerald-800 dark:text-emerald-300 px-4 py-2 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <CheckCircle2 className="h-4 w-4" />
              Publish Scheduled Exam
            </button>
            <button
              type="button"
              onClick={() => void handleBuildExam('start_now')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <Play className="h-4 w-4" />
              Start Demo Exam Now
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};
