import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileUp,
  Flag,
  ImagePlus,
  Lock,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DashboardShell } from '../../components/DashboardShell';
import { StatusLabel, examStatusTone } from '../../components/StatusLabel';
import {
  computeRemainingMs,
  deriveExamLifecycleStatus,
  formatCountdown,
  formatKarachiDateTime,
  isExamExpired,
  isExamWindowOpen,
} from '../../lib/examTimer';
import { canStudentAccessExam } from '../../lib/permissions';
import { assembleImagesToPdfBase64, fileToBase64 } from '../../lib/pdfUtils';
import type { StoredPdfAsset } from '../../types/domain';

export const StudentExamsListPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  if (!db || !currentUser || currentUser.role !== 'student') return null;

  const enrolledExams = db.exams.filter((ex) => canStudentAccessExam(currentUser, ex));

  const enriched = enrolledExams.map((ex) => {
    const sub = db.submissions.find(
      (s) => s.examId === ex.id && s.studentId === currentUser.id
    );
    const status = deriveExamLifecycleStatus(ex, sub);
    const course = db.courses.find((c) => c.id === ex.courseId);
    return { ex, sub, status, course };
  });

  const filtered =
    filterStatus === 'all'
      ? enriched
      : enriched.filter((item) => item.status === filterStatus);

  return (
    <DashboardShell title="My Examinations" breadcrumb="Student · Enrolled Assessments Only">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
            {['all', 'Available', 'In Progress', 'Upcoming', 'Submitted', 'Under Review', 'Result Published'].map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    filterStatus === st
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st === 'all' ? 'All Exams' : st}
                </button>
              )
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filtered.length} enrolled course exam(s)
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No exams match the selected status filter.
            </div>
          ) : (
            filtered.map(({ ex, status, course }) => (
              <div
                key={ex.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {course?.code}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{ex.type}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ex.isDemoSlotLabel}</span>
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    {ex.title}
                  </h3>
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                    Window: {formatKarachiDateTime(ex.startAt)} → {formatKarachiDateTime(ex.endAt)} (Asia/Karachi) · {ex.totalMarks} Marks
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <StatusLabel tone={examStatusTone(status)} label={status} />
                  <Link
                    to={`/student/exams/${ex.id}/instructions`}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
                  >
                    {status === 'Available' ? 'Start Exam' : status === 'In Progress' ? 'Resume Exam' : 'View Details'}
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export const StudentExamInstructionsPage: React.FC = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { db, currentUser, startOrResumeExamAttempt } = useAppState();

  if (!db || !currentUser || currentUser.role !== 'student') return null;

  const exam = db.exams.find((e) => e.id === examId);
  if (!exam || !canStudentAccessExam(currentUser, exam)) {
    return (
      <DashboardShell title="Exam Access Restricted" breadcrumb="Student · Authorization Check">
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 p-6 space-y-3 max-w-xl">
          <h2 className="font-display text-lg font-bold text-red-700 dark:text-red-400">
            Not Enrolled or Exam Unavailable
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Only students enrolled in the corresponding course can view or attempt this examination.
          </p>
          <Link to="/student/exams" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <ArrowLeft className="h-4 w-4" />
            Return to My Exams
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const course = db.courses.find((c) => c.id === exam.courseId);
  const existingSub = db.submissions.find(
    (s) => s.examId === exam.id && s.studentId === currentUser.id
  );
  const status = deriveExamLifecycleStatus(exam, existingSub);
  const windowOpen = isExamWindowOpen(exam);
  const expired = isExamExpired(exam);

  const handleStart = () => {
    startOrResumeExamAttempt(exam.id);
    navigate(`/student/exams/${exam.id}/attempt`);
  };

  return (
    <DashboardShell title={exam.title} breadcrumb={`Instructions · ${course?.code ?? ''}`}>
      <div className="max-w-3xl space-y-6">
        <Link
          to="/student/exams"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Exams
        </Link>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {exam.isDemoSlotLabel}
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {course?.code} — {course?.title}
              </h2>
            </div>
            <StatusLabel tone={examStatusTone(status)} label={status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-slate-200 dark:border-slate-800 py-4 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Start Time (Asia/Karachi)</div>
              <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {formatKarachiDateTime(exam.startAt)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Hard End Deadline</div>
              <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {formatKarachiDateTime(exam.endAt)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Total Marks & Items</div>
              <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {exam.totalMarks} Marks · {exam.questionIds.length} Questions
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100">
              Examination Rules & Honest Browser Policy
            </h3>
            <p>{exam.instructions}</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li>
                <strong>Strict Fixed Wall-Clock Window:</strong> Entering late does not grant extra time. The exam locks automatically at the exact end timestamp.
              </li>
              <li>
                <strong>Refresh & Reconnect Safe:</strong> Your selections and typed answers auto-save locally to IndexedDB. Refreshing the page resumes remaining time without terminating your attempt.
              </li>
              <li>
                <strong>Integrity Warning Policy (Transparent Demo):</strong> Switching tabs or blurring the browser window logs an incident and displays a warning. A single focus change does <em>not</em> silently auto-submit your exam. {exam.integrity.strictModeEnabled ? `Strict Demo Mode is enabled for this paper (threshold: ${exam.integrity.strictWarningThreshold} warnings).` : 'Note: Browser timers/focus checks are simulated and cannot stop external devices or secondary screens.'}
              </li>
              <li>
                <strong>MCQ Scores Withheld:</strong> Correct MCQ keys and marks remain hidden until your teacher publishes the combined result.
              </li>
            </ul>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {existingSub?.isFinalized ? (
              <div className="flex flex-wrap items-center gap-3">
                <StatusLabel tone="locked" label={`Submitted · Receipt ${existingSub.receiptCode}`} />
                <Link
                  to="/student/submissions"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  View Submission Receipt
                </Link>
              </div>
            ) : windowOpen ? (
              <button
                type="button"
                onClick={handleStart}
                className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {existingSub ? 'Resume Exam Attempt' : 'Start Exam Now'}
              </button>
            ) : expired ? (
              <StatusLabel tone="danger" label="Exam Window Has Closed (No Late Entry)" />
            ) : (
              <StatusLabel tone="neutral" label="Exam Window Has Not Opened Yet" />
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export const StudentExamAttemptPage: React.FC = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const {
    db,
    currentUser,
    setActiveExamAttemptId,
    startOrResumeExamAttempt,
    updateExamDraft,
    uploadPdfAsset,
    logExamIncident,
    finalizeExamAttempt,
    pushToast,
  } = useAppState();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [mcqsPerPage, setMcqsPerPage] = useState<number>(2);
  const [mcqPage, setMcqPage] = useState<number>(0);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState<boolean>(false);
  const [focusWarningBanner, setFocusWarningBanner] = useState<string | null>(null);
  const [isDictatingForQ, setIsDictatingForQ] = useState<string | null>(null);
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const hasAutoFinalizedRef = useRef(false);

  const exam = db?.exams.find((e) => e.id === examId);
  const submission = db?.submissions.find(
    (s) => s.examId === examId && s.studentId === currentUser?.id
  );

  useEffect(() => {
    if (exam && currentUser?.role === 'student' && !submission?.isFinalized) {
      if (!submission) {
        startOrResumeExamAttempt(exam.id);
      }
      setActiveExamAttemptId(exam.id);
    }
    return () => setActiveExamAttemptId(null);
  }, [exam?.id, currentUser?.role, submission?.isFinalized]);

  // Fixed wall-clock ticker + deadline lock
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-finalize at exact wall-clock deadline
  useEffect(() => {
    if (!exam || !submission || submission.isFinalized || hasAutoFinalizedRef.current) return;
    const remaining = computeRemainingMs(exam.endAt, nowMs);
    if (remaining <= 0) {
      hasAutoFinalizedRef.current = true;
      void finalizeExamAttempt(exam.id, 'deadline_expired', pendingImageFiles.length > 0).then(
        () => {
          pushToast('warning', 'Exam deadline reached. Your local attempt has been locked and finalized.');
        }
      );
    }
  }, [exam, submission, nowMs, finalizeExamAttempt, pendingImageFiles.length, pushToast]);

  // Tab visibility / blur warning logger (NOT silent auto-submit on single switch)
  useEffect(() => {
    if (!exam || !submission || submission.isFinalized || !exam.integrity.warnOnTabSwitch) return;

    const recordSwitch = async (kind: 'visibility_hidden' | 'window_blur', msg: string) => {
      const count = await logExamIncident(exam.id, kind, msg);
      setFocusWarningBanner(
        `Integrity Warning #${count}: ${msg} This event is logged transparently. Please remain on the exam tab.`
      );
      if (
        exam.integrity.strictModeEnabled &&
        count >= exam.integrity.strictWarningThreshold &&
        !hasAutoFinalizedRef.current
      ) {
        hasAutoFinalizedRef.current = true;
        await logExamIncident(
          exam.id,
          'strict_auto_finalized',
          `Strict Demo Mode threshold (${exam.integrity.strictWarningThreshold}) reached.`
        );
        await finalizeExamAttempt(exam.id, 'strict_threshold', pendingImageFiles.length > 0);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void recordSwitch('visibility_hidden', 'Tab visibility changed away from exam screen.');
      }
    };
    const onBlur = () => {
      void recordSwitch('window_blur', 'Browser window lost focus during active exam.');
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [exam, submission?.id, submission?.isFinalized, logExamIncident, finalizeExamAttempt, pendingImageFiles.length]);

  const examQuestions = useMemo(() => {
    if (!db || !exam) return [];
    return exam.questionIds
      .map((qid) => db.questions.find((q) => q.id === qid))
      .filter((q): q is NonNullable<typeof q> => Boolean(q))
      .sort((a, b) => a.order - b.order);
  }, [db, exam]);

  if (!db || !currentUser || currentUser.role !== 'student' || !exam) {
    return null;
  }

  if (!canStudentAccessExam(currentUser, exam)) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-red-600">You are not enrolled in this course.</p>
        <Link to="/student/exams" className="text-xs underline mt-2 inline-block">Back</Link>
      </div>
    );
  }

  const mcqQuestions = examQuestions.filter((q) => q.type === 'mcq');
  const subjectiveQuestions = examQuestions.filter((q) => q.type !== 'mcq');
  const totalMcqPages = Math.max(1, Math.ceil(mcqQuestions.length / mcqsPerPage));
  const safeMcqPage = Math.min(mcqPage, totalMcqPages - 1);
  const visibleMcqs = mcqQuestions.slice(
    safeMcqPage * mcqsPerPage,
    safeMcqPage * mcqsPerPage + mcqsPerPage
  );

  const remainingMs = computeRemainingMs(exam.endAt, nowMs);
  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    );

  // If already finalized, show locked receipt view
  if (submission?.isFinalized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-10 flex items-center justify-center">
        <div className="max-w-xl w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-5">
          <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide">Attempt Locked & Recorded</div>
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {exam.title}
              </h1>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Submission Receipt</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{submission.receiptCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Submitted At (Asia/Karachi)</span>
              <span className="font-mono">{submission.submittedAt ? formatKarachiDateTime(submission.submittedAt) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">MCQs Answered</span>
              <span className="font-mono tabular-nums">{Object.keys(submission.mcqAnswers).length} / {mcqQuestions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Subjective PDF</span>
              <span className="font-mono">{submission.subjectivePdfFileName ?? 'None (typed answers)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">MCQ Score Status</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                Withheld until Teacher publishes combined result
              </span>
            </div>
          </div>

          {submission.unsubmittedPdfWarning && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
              Note: You had selected handwritten images that were not assembled/uploaded before lock. Only saved PDFs/text are included.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/student/submissions')}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              View My Submissions
            </button>
            <button
              type="button"
              onClick={() => navigate('/student/dashboard')}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mcqAnswers = submission?.mcqAnswers ?? {};
  const flaggedIds = submission?.flaggedQuestionIds ?? [];
  const subjTexts = submission?.subjectiveTextAnswers ?? {};

  const handleSelectMcq = (questionId: string, optionIndex: number) => {
    void updateExamDraft(exam.id, {
      mcqAnswers: { ...mcqAnswers, [questionId]: optionIndex },
    });
  };

  const handleToggleFlag = (questionId: string) => {
    const next = flaggedIds.includes(questionId)
      ? flaggedIds.filter((id) => id !== questionId)
      : [...flaggedIds, questionId];
    void updateExamDraft(exam.id, { flaggedQuestionIds: next });
  };

  const handleUploadSinglePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      pushToast('error', 'Only a single valid .pdf file is accepted for subjective PDF upload.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      pushToast('error', 'PDF exceeds the 15 MB browser IndexedDB demo limit.');
      return;
    }
    setUploadingPdf(true);
    try {
      const base64Data = await fileToBase64(file);
      const asset: StoredPdfAsset = {
        id: `pdf-${exam.id}-${currentUser.id}`,
        fileName: file.name,
        mimeType: 'application/pdf',
        sizeBytes: file.size,
        base64Data,
        createdAt: new Date().toISOString(),
      };
      await uploadPdfAsset(asset);
      await updateExamDraft(exam.id, {
        subjectivePdfAssetId: asset.id,
        subjectivePdfFileName: file.name,
        subjectivePdfSizeBytes: file.size,
      });
      pushToast('success', `Uploaded combined subjective PDF "${file.name}".`);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'PDF upload failed.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleAssembleImages = async () => {
    if (pendingImageFiles.length === 0) return;
    setUploadingPdf(true);
    try {
      const { base64Data, sizeBytes } = await assembleImagesToPdfBase64(pendingImageFiles);
      const fileName = `${currentUser.rollNumber}_${exam.courseId}_Combined.pdf`;
      const asset: StoredPdfAsset = {
        id: `pdf-${exam.id}-${currentUser.id}`,
        fileName,
        mimeType: 'application/pdf',
        sizeBytes,
        base64Data,
        createdAt: new Date().toISOString(),
      };
      await uploadPdfAsset(asset);
      await updateExamDraft(exam.id, {
        subjectivePdfAssetId: asset.id,
        subjectivePdfFileName: fileName,
        subjectivePdfSizeBytes: sizeBytes,
      });
      setPendingImageFiles([]);
      pushToast('success', `Assembled ${pendingImageFiles.length} image(s) into "${fileName}".`);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Failed to assemble PDF from images.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const toggleVoiceDictation = (questionId: string) => {
    if (!speechSupported) return;
    if (isDictatingForQ === questionId) {
      recognitionRef.current?.stop();
      setIsDictatingForQ(null);
      return;
    }

    const SpeechCtor =
      (window as unknown as Record<string, new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      }>).SpeechRecognition ||
      (window as unknown as Record<string, new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      }>).webkitSpeechRecognition;

    const rec = new SpeechCtor();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' ';
      }
      const existing = subjTexts[questionId] ?? '';
      void updateExamDraft(exam.id, {
        subjectiveTextAnswers: {
          ...subjTexts,
          [questionId]: `${existing}${existing ? ' ' : ''}${transcript.trim()}`,
        },
      });
    };
    rec.onerror = () => setIsDictatingForQ(null);
    rec.onend = () => setIsDictatingForQ(null);
    recognitionRef.current = rec;
    setIsDictatingForQ(questionId);
    rec.start();
  };

  const unansweredMcqCount = mcqQuestions.filter((q) => mcqAnswers[q.id] === undefined).length;
  const answeredMcqCount = mcqQuestions.length - unansweredMcqCount;
  const answeredSubjCount = subjectiveQuestions.filter(
    (q) => Boolean(subjTexts[q.id]?.trim()) || Boolean(submission?.subjectivePdfAssetId)
  ).length;
  const totalQuestionCount = examQuestions.length;
  const attemptedTotalCount = answeredMcqCount + answeredSubjCount;
  const remainingTotalCount = Math.max(0, totalQuestionCount - attemptedTotalCount);
  const progressPct =
    totalQuestionCount > 0 ? Math.round((attemptedTotalCount / totalQuestionCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Distraction-Free Exam Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {currentUser.name} ({currentUser.rollNumber}) · {exam.isDemoSlotLabel}
          </div>
          <h1 className="font-display text-base font-bold truncate">{exam.title}</h1>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {online ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <Wifi className="h-3.5 w-3.5" />
                Local Draft Synced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <WifiOff className="h-3.5 w-3.5" />
                Offline (Saving Locally Only)
              </span>
            )}
          </div>

          <div
            data-testid="exam-countdown"
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm font-bold tabular-nums ${
              remainingMs < 5 * 60 * 1000
                ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{formatCountdown(remainingMs)}</span>
          </div>

          <button
            type="button"
            onClick={() => setConfirmSubmitOpen(true)}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {focusWarningBanner && (
        <div
          role="alert"
          className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-300 dark:border-amber-800 px-4 lg:px-8 py-2.5 flex items-center justify-between gap-4 text-xs text-amber-900 dark:text-amber-200"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {focusWarningBanner}
          </span>
          <button
            type="button"
            onClick={() => setFocusWarningBanner(null)}
            className="underline font-semibold shrink-0"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Main Split Attempt Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Questions Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* MCQ Controls Bar */}
          {mcqQuestions.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="font-display text-base font-bold">
                    Section A — Objective MCQs
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selections auto-save immediately. Correct keys are withheld until result publication.
                  </p>
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span>MCQs per page:</span>
                  <select
                    value={mcqsPerPage}
                    onChange={(e) => {
                      setMcqsPerPage(Number(e.target.value));
                      setMcqPage(0);
                    }}
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-6">
                {visibleMcqs.map((q) => {
                  const chosen = mcqAnswers[q.id];
                  const isFlagged = flaggedIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          <span className="font-mono text-emerald-700 dark:text-emerald-400 mr-2">
                            Q{q.order}.
                          </span>
                          {q.prompt}
                          <span className="ml-2 font-mono text-xs text-slate-500">({q.points} pts)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleFlag(q.id)}
                          aria-label={`Flag question ${q.order} for review`}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium shrink-0 ${
                            isFlagged
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Flag className="h-3.5 w-3.5" />
                          {isFlagged ? 'Flagged' : 'Flag'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(q.options ?? []).map((opt, idx) => (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                              chosen === idx
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`mcq-${q.id}`}
                              checked={chosen === idx}
                              onChange={() => handleSelectMcq(q.id, idx)}
                              className="accent-emerald-700"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={safeMcqPage === 0}
                  onClick={() => setMcqPage((p) => Math.max(0, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  Page {safeMcqPage + 1} of {totalMcqPages}
                </span>
                <button
                  type="button"
                  disabled={safeMcqPage >= totalMcqPages - 1}
                  onClick={() => setMcqPage((p) => Math.min(totalMcqPages - 1, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                >
                  Skip / Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          {/* Subjective Section */}
          {subjectiveQuestions.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="font-display text-base font-bold">
                  Section B — Subjective Questions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Type answers below (with optional browser speech dictation) OR upload one single combined PDF containing all handwritten subjective solutions.
                </p>
              </div>

              <div className="space-y-5">
                {subjectiveQuestions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <label
                        htmlFor={`subj-${q.id}`}
                        className="text-sm font-semibold text-slate-900 dark:text-slate-100"
                      >
                        <span className="font-mono text-emerald-700 dark:text-emerald-400 mr-2">
                          Q{q.order}.
                        </span>
                        {q.prompt}
                        <span className="ml-2 font-mono text-xs text-slate-500">({q.points} pts)</span>
                      </label>

                      {speechSupported ? (
                        <button
                          type="button"
                          onClick={() => toggleVoiceDictation(q.id)}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium shrink-0 ${
                            isDictatingForQ === q.id
                              ? 'bg-red-600 text-white'
                              : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isDictatingForQ === q.id ? (
                            <>
                              <MicOff className="h-3.5 w-3.5" /> Stop Dictation
                            </>
                          ) : (
                            <>
                              <Mic className="h-3.5 w-3.5" /> Dictate
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 shrink-0">
                          Speech API unavailable in this browser
                        </span>
                      )}
                    </div>

                    <textarea
                      id={`subj-${q.id}`}
                      rows={q.type === 'long' ? 5 : 3}
                      value={subjTexts[q.id] ?? ''}
                      onChange={(e) =>
                        void updateExamDraft(exam.id, {
                          subjectiveTextAnswers: { ...subjTexts, [q.id]: e.target.value },
                        })
                      }
                      placeholder="Type your response or note 'See attached combined PDF'..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                ))}
              </div>

              {/* Single Combined PDF Upload or Image-to-PDF Assembler */}
              <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Combined Subjective Answer PDF (One Final PDF Per Attempt)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Upload a single PDF (≤ 15 MB) OR select handwritten page images to combine into one PDF.
                    </div>
                  </div>
                  {submission?.subjectivePdfFileName && (
                    <StatusLabel tone="success" label={`Uploaded: ${submission.subjectivePdfFileName}`} />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <FileUp className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    <span>{submission?.subjectivePdfFileName ? 'Replace PDF' : 'Upload Single PDF'}</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={uploadingPdf}
                      onChange={handleUploadSinglePdf}
                      className="sr-only"
                    />
                  </label>

                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <ImagePlus className="h-4 w-4 text-amber-600" />
                    <span>Select Handwritten Images ({pendingImageFiles.length})</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      multiple
                      disabled={uploadingPdf}
                      onChange={(e) => setPendingImageFiles(Array.from(e.target.files ?? []))}
                      className="sr-only"
                    />
                  </label>

                  {pendingImageFiles.length > 0 && (
                    <button
                      type="button"
                      disabled={uploadingPdf}
                      onClick={handleAssembleImages}
                      className="rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                    >
                      {uploadingPdf ? 'Building PDF...' : 'Assemble & Attach Combined PDF'}
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar: Exam Progress, Question Navigator, Status Legend */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 sticky top-20">
            {/* Live Exam Progress & Status Strip */}
            <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Exam Progress
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {progressPct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2">
                  <div className="text-[11px] text-slate-500">Attempted</div>
                  <div className="font-mono font-bold tabular-nums">{attemptedTotalCount} / {totalQuestionCount}</div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2">
                  <div className="text-[11px] text-slate-500">Remaining</div>
                  <div className="font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums">{remainingTotalCount}</div>
                </div>
              </div>
              <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                Status: In Progress (Auto-Saving Locally)
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold">Question Navigator</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                MCQs Attempted: {answeredMcqCount} / {mcqQuestions.length} · Subjective: {answeredSubjCount} / {subjectiveQuestions.length}
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {mcqQuestions.map((q, idx) => {
                const answered = mcqAnswers[q.id] !== undefined;
                const flagged = flaggedIds.includes(q.id);
                const pageIdx = Math.floor(idx / mcqsPerPage);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setMcqPage(pageIdx)}
                    className={`h-9 rounded-lg font-mono text-xs font-semibold border transition-colors ${
                      flagged
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : answered
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Q{q.order}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-600 inline-block" /> Answered
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-amber-500 bg-amber-100 inline-block" /> Flagged for Review
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-slate-300 bg-slate-100 inline-block" /> Unanswered
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Integrity Incidents Logged: {submission?.incidents.length ?? 0}
              </div>
              <p>
                {submission?.lastSavedAt
                  ? `Last local save: ${formatKarachiDateTime(submission.lastSavedAt)}`
                  : 'Draft ready'}
              </p>
            </div>
          </div>
        </aside>
      </main>

      {/* Submit Confirmation Modal */}
      {confirmSubmitOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Confirm Final Submission?</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Once submitted, your attempt is locked and cannot be reopened. Unanswered MCQs: <strong>{unansweredMcqCount}</strong>.
              {pendingImageFiles.length > 0 && !submission?.subjectivePdfAssetId
                ? ' Warning: You selected handwritten images but have not clicked "Assemble & Attach Combined PDF" yet.'
                : ''}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold"
              >
                Continue Reviewing
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmSubmitOpen(false);
                  await finalizeExamAttempt(
                    exam.id,
                    'manual_submit',
                    pendingImageFiles.length > 0
                  );
                }}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
