import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import type { UserRole } from '../types/domain';
import { useAppState } from '../context/AppStateContext';

interface WalkthroughStep {
  topic: string;
  title: string;
  body: string;
}

const DEMO_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    topic: '1 · Student Dashboard',
    title: 'Student Dashboard & Available Demo Exams',
    body: 'Students see their synthetic profile (Ayesha Gillani), enrolled courses, and a dedicated "Available Demo Exams" section showing live demo assessments ready to start immediately—completely separate from official BZU calendar dates.',
  },
  {
    topic: '2 · Teacher Dashboard',
    title: 'Teacher Dashboard & Scoped Classes',
    body: 'Teachers see only their assigned courses and enrolled students. From here you can click "Create Demo Exam", track submission progress counts, or open "Demo Exam Submissions" to grade papers.',
  },
  {
    topic: '3 · Admin Dashboard',
    title: 'Admin Dashboard & Governance Controls',
    body: 'The Controller Admin oversees the 500/25/1 academic directory, reviews pending Marks Revision Requests, configures Checked-Paper Visibility Policies, inspects integrity logs, and resets Demo Data.',
  },
  {
    topic: '4 · Creating an Exam',
    title: 'Create Demo Exam & Start Demo Exam Now',
    body: 'In Exam Builder, choose an assigned course, enter title and type (Midterm, Final Term, Quiz, Class Test), add MCQs/short/long questions or import from PDF/DOCX, set question marks and exam duration, and click "Start Demo Exam Now".',
  },
  {
    topic: '5 · Attempting an Exam',
    title: 'Timed Student Attempt & Refresh Persistence',
    body: 'Clicking "Start Exam" starts a wall-clock countdown persisted in IndexedDB. Every MCQ click auto-saves locally; students can skip, revisit, flag, and change options, while refreshing keeps the exact timer deadline intact.',
  },
  {
    topic: '6 · Subjective Answers',
    title: 'Typed, Voice-Dictated & Combined PDF Answers',
    body: 'Students can type subjective responses, use browser speech-to-text dictation (where supported), or upload one combined PDF (or assemble handwritten images into a single PDF) before final submission.',
  },
  {
    topic: '7 · Checking a Paper',
    title: 'On-Site Paper Checker & PDF.js Annotations',
    body: 'Teachers open Demo Exam Submissions, inspect per-question MCQ selections and auto-calculated scores, view the student PDF inside the site via PDF.js without downloading, draw annotations, save marking progress drafts, and finalize initial marks.',
  },
  {
    topic: '8 · Publishing Results',
    title: 'Marks Revisions & Instant Result Publication',
    body: 'After initial marks are finalized, edits require Admin approval via a Marks Revision Request. Once all papers are checked and zero revisions are pending, click "Publish Demo Results Now" so students view grades, remarks, and checked PDFs.',
  },
];

const ROLE_DEFAULT_STEP: Record<UserRole, number> = {
  student: 0,
  teacher: 1,
  admin: 2,
};

export const GuidedTourModal: React.FC = () => {
  const { tourOpenForRole, closeTour } = useAppState();
  const [stepIndex, setStepIndex] = useState<number | null>(null);

  if (!tourOpenForRole) return null;
  const activeIdx = stepIndex ?? ROLE_DEFAULT_STEP[tourOpenForRole];
  const current = DEMO_WALKTHROUGH_STEPS[Math.min(activeIdx, DEMO_WALKTHROUGH_STEPS.length - 1)];

  const handleClose = (completed: boolean) => {
    setStepIndex(null);
    closeTour(completed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-tour-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              DEMO MODE WALKTHROUGH · {current.topic} · STEP {activeIdx + 1} OF {DEMO_WALKTHROUGH_STEPS.length}
            </div>
            <h2
              id="guided-tour-title"
              className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100"
            >
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => handleClose(true)}
            aria-label="Close guided tour"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {current.body}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {DEMO_WALKTHROUGH_STEPS.map((s, idx) => (
            <button
              key={s.topic}
              type="button"
              onClick={() => setStepIndex(idx)}
              className={`rounded px-2 py-0.5 text-[11px] font-mono ${
                idx === activeIdx
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => handleClose(true)}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {activeIdx > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex(Math.max(0, activeIdx - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {activeIdx < DEMO_WALKTHROUGH_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex(activeIdx + 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleClose(true)}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Finish Walkthrough
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
