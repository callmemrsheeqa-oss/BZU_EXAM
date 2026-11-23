import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Users,
  PenSquare,
  Rocket,
  ClipboardList,
  FileCheck2,
  GitPullRequest,
  Send,
  RotateCcw,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { DashboardShell } from './DashboardShell';
import { StatusLabel } from './StatusLabel';
import { canPublishExamResultsNow } from '../lib/revisionPolicy';
import { formatKarachiDateTime, isExamWindowOpen } from '../lib/examTimer';
import type { UserRole } from '../types/domain';

export const DemoControlPanelPage: React.FC = () => {
  const {
    db,
    currentUser,
    demoModeActive,
    launchDemoMode,
    loginQuickDemoRole,
    startDemoExamNow,
    publishExamResultsNow,
    resetDemoDataset,
    replayTour,
    pushToast,
  } = useAppState();
  const navigate = useNavigate();

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [confirmReset, setConfirmReset] = useState(false);

  const allExams = useMemo(() => db?.exams ?? [], [db]);
  const activeExamId =
    selectedExamId && allExams.some((e) => e.id === selectedExamId)
      ? selectedExamId
      : allExams[0]?.id ?? '';

  if (!db || !currentUser) return null;

  const targetExam = allExams.find((e) => e.id === activeExamId);
  const targetCourse = targetExam ? db.courses.find((c) => c.id === targetExam.courseId) : undefined;
  const finalizedSubsForTarget = targetExam
    ? db.submissions.filter((s) => s.examId === targetExam.id && s.isFinalized)
    : [];
  const nextUncheckedSub =
    db.submissions.find((s) => s.isFinalized && !s.initialMarksSaved) ??
    db.submissions.find((s) => s.isFinalized);
  const pendingRevisions = db.revisionRequests.filter((r) => r.status === 'pending');
  const publishGate = targetExam
    ? canPublishExamResultsNow(targetExam.id, db.submissions, db.revisionRequests)
    : null;

  const handleLaunchDemoMode = () => {
    launchDemoMode();
  };

  const handleRoleSwitch = (role: UserRole) => {
    loginQuickDemoRole(role);
  };

  const handleCreateDemoExam = () => {
    launchDemoMode('teacher');
    navigate('/teacher/exam-builder?demo=1');
  };

  const handleStartDemoExamNow = async () => {
    if (!targetExam) {
      pushToast('error', 'No exam selected to launch.');
      return;
    }
    await startDemoExamNow(targetExam.id, durationMinutes);
  };

  const handleViewSubmissions = () => {
    launchDemoMode('teacher');
    navigate('/teacher/submissions');
  };

  const handleCheckDemoPaper = () => {
    launchDemoMode('teacher');
    if (nextUncheckedSub) {
      navigate(`/teacher/submissions?subId=${nextUncheckedSub.id}`);
    } else {
      navigate('/teacher/submissions');
    }
  };

  const handleReviewRevisions = () => {
    launchDemoMode('admin');
    navigate('/admin/revisions');
  };

  const handlePublishDemoResultsNow = async () => {
    if (!targetExam) return;
    await publishExamResultsNow(targetExam.id);
  };

  return (
    <DashboardShell
      title="Interactive Demo Control Panel"
      breadcrumb="Demo Testing Hub · Independent of Official BZU Academic Calendar"
    >
      <div className="space-y-6">
        {/* Status & Official Calendar Separation Notice */}
        <section className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span>{demoModeActive ? 'Interactive Demo Mode: ACTIVE' : 'Interactive Demo Mode: READY'}</span>
              <span aria-hidden="true">·</span>
              <span>Current Role: {currentUser.role.toUpperCase()} ({currentUser.name})</span>
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              End-to-End Examination Lifecycle Testing Workspace
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl">
              Test exam authoring, immediate student attempts, on-site PDF.js marking, Admin marks revision approvals, and instant result publication in this browser’s shared IndexedDB store. Official BZU Fall 2026, Spring 2027, and Summer 2027 dates remain preserved verbatim.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLaunchDemoMode}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <Play className="h-3.5 w-3.5" />
              Launch Demo Mode
            </button>
            <button
              type="button"
              onClick={replayTour}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Start Guided Walkthrough
            </button>
            <Link
              to="/calendar"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <CalendarDays className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              Official Calendar
            </Link>
          </div>
        </section>

        {/* Control 1 & 2: Switch Demo User Role + Target Exam Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                Switch Demo User Role
              </h3>
              <StatusLabel tone="info" label={`Active: ${currentUser.role.toUpperCase()}`} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Switch instantly between Student (Ayesha Gillani), Teacher (Dr. Tariq Mahmood Qureshi), and Admin (Controller Demo) using the same browser-local IndexedDB state.
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {(['student', 'teacher', 'admin'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleSwitch(role)}
                  className={`rounded-lg border px-3 py-2.5 text-xs font-semibold capitalize transition-colors ${
                    currentUser.role === role
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {role} Role
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              <Link to="/student/dashboard" onClick={() => launchDemoMode('student')} className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline">
                Open Student Dashboard →
              </Link>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <Link to="/teacher/dashboard" onClick={() => launchDemoMode('teacher')} className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline">
                Open Teacher Dashboard →
              </Link>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <Link to="/admin/dashboard" onClick={() => launchDemoMode('admin')} className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline">
                Open Admin Dashboard →
              </Link>
            </div>
          </section>

          {/* Target Exam Launcher & Instant Publish Control */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold flex items-center gap-2">
                <Rocket className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Target Exam Immediate Launcher & Publisher
              </h3>
              {targetExam && (
                <StatusLabel
                  tone={isExamWindowOpen(targetExam) ? 'success' : 'neutral'}
                  label={isExamWindowOpen(targetExam) ? 'Window Live Now' : 'Not Live'}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Select Assessment</label>
                <select
                  value={activeExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                >
                  {allExams.map((ex) => {
                    const c = db.courses.find((x) => x.id === ex.courseId);
                    return (
                      <option key={ex.id} value={ex.id}>
                        {c?.code ?? ex.courseId} — {ex.title} ({ex.type})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Duration (Min)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            {targetExam && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {targetCourse?.code} · {targetExam.title}
                </div>
                <div className="font-mono text-slate-500 tabular-nums">
                  Current Window: {formatKarachiDateTime(targetExam.startAt)} → {formatKarachiDateTime(targetExam.endAt)}
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  Finalized submissions: <strong className="font-mono">{finalizedSubsForTarget.length}</strong>
                  {publishGate && !publishGate.allowed && (
                    <span className="ml-2 text-amber-700 dark:text-amber-400">· {publishGate.reason}</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => void handleStartDemoExamNow()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <Play className="h-3.5 w-3.5" />
                Start Demo Exam Now
              </button>
              <button
                type="button"
                disabled={!publishGate?.allowed}
                onClick={() => void handlePublishDemoResultsNow()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                Publish Demo Results Now
              </button>
            </div>
          </section>
        </div>

        {/* All Quick Workflow Actions Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={handleCreateDemoExam}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-emerald-600 transition-colors space-y-2"
          >
            <div className="flex items-center justify-between">
              <PenSquare className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <span className="text-[11px] font-mono text-slate-500">TEACHER</span>
            </div>
            <div className="font-display font-bold text-sm">Create Demo Exam</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Author MCQs & subjective questions, import PDF/Word drafts, set duration, and start immediately.
            </p>
          </button>

          <button
            type="button"
            onClick={handleViewSubmissions}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-emerald-600 transition-colors space-y-2"
          >
            <div className="flex items-center justify-between">
              <ClipboardList className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <span className="text-[11px] font-mono text-slate-500">
                {db.submissions.filter((s) => s.isFinalized).length} SUBMITTED
              </span>
            </div>
            <div className="font-display font-bold text-sm">View Demo Submissions</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Browse student attempts by exam, monitor completion counts, and check submission status.
            </p>
          </button>

          <button
            type="button"
            onClick={handleCheckDemoPaper}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-emerald-600 transition-colors space-y-2"
          >
            <div className="flex items-center justify-between">
              <FileCheck2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
                {db.submissions.filter((s) => s.isFinalized && !s.initialMarksSaved).length} UNCHECKED
              </span>
            </div>
            <div className="font-display font-bold text-sm">Check Demo Paper</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review MCQ answers, annotate student PDFs on-site via PDF.js, save draft progress, and finalize marks.
            </p>
          </button>

          <button
            type="button"
            onClick={handleReviewRevisions}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-emerald-600 transition-colors space-y-2"
          >
            <div className="flex items-center justify-between">
              <GitPullRequest className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-[11px] font-mono text-red-700 dark:text-red-400">
                {pendingRevisions.length} PENDING
              </span>
            </div>
            <div className="font-display font-bold text-sm">Review Marks Revision Requests</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Approve or reject teacher marks revision requests in the Admin governance queue.
            </p>
          </button>
        </section>

        {/* Student Shortcut & Reset Demo Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Student Demo Testing Shortcuts
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Jump directly to Available Demo Exams or Published Results as Student 001 (Ayesha Gillani).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  launchDemoMode('student');
                  navigate('/student/dashboard');
                }}
                className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                View Available Demo Exams
              </button>
              <button
                type="button"
                onClick={() => {
                  launchDemoMode('student');
                  navigate('/student/results');
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                View Student Results
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-sm font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Reset Demo Data
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Restore the initial seeded 500 students, 25 teachers, 1 admin, and clean sample fixtures in IndexedDB.
            </p>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Demo Data
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await resetDemoDataset();
                    setConfirmReset(false);
                  }}
                  className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Confirm Reset to Initial Seed
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
};
