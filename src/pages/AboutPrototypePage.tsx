import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Database,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  BookOpenCheck,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { DashboardShell } from '../components/DashboardShell';

export const AboutPrototypePage: React.FC = () => {
  const { currentUser, resetDemoDataset } = useAppState();
  const [confirmReset, setConfirmReset] = useState(false);

  const body = (
    <div className="space-y-6 max-w-4xl">
      {!currentUser && (
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
          Prototype & Local Browser Storage Disclosure
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <strong>BZU Exam</strong> is an interactive, zero-budget portfolio/pitch prototype modeled around Bahauddin Zakariya University (BZU), Multan. It is <strong>not affiliated with or officially endorsed by BZU</strong>, does not connect to any institutional database, and uses <strong>500 synthetic students, 25 synthetic teachers, and 1 synthetic admin</strong>.
        </p>
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
          <div className="font-semibold flex items-center gap-1.5">
            <Database className="h-4 w-4" />
            Browser-Only Persistence (IndexedDB + localStorage)
          </div>
          <p>
            All exam attempts, uploaded PDFs, teacher overlay annotations, marks revisions, and audit logs persist inside <strong>this single browser profile</strong> via IndexedDB. Changes do <strong>not</strong> sync across separate computers, phones, browsers, or incognito windows.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
          Same-Browser Cross-Role End-to-End Walkthrough
        </h3>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <strong>Student Demo (student001@bzu.edu.pk / BzuDemo#Stu001):</strong> Open the <em>Interactive Demo Exam — Real Analysis I (Live Sandbox)</em>, answer MCQs (1–5 per view), type or dictate subjective answers or upload a PDF, and submit. Notice MCQ scores are withheld until publication.
          </li>
          <li>
            <strong>Teacher Demo (teacher001@bzu.edu.pk / BzuDemo#Teach001):</strong> Open <em>Paper Checker</em>, inspect a submitted student PDF directly inside PDF.js, draw overlay pen/checkmarks/comments, save initial subjective marks, and then attempt to edit them pre-publication—which submits a mandatory <strong>Marks Revision Request</strong> to Admin.
          </li>
          <li>
            <strong>Admin Demo (admin@admin.bzu.edu.pk / BzuDemo#Admin01):</strong> Open <em>Revision Queue</em>, approve or reject pending revisions (notice result publication is held while pending), and toggle the <em>Checked-Paper Visibility Policy</em>.
          </li>
          <li>
            <strong>Return to Teacher → Student:</strong> Teacher publishes the resolved result; Student views combined MCQ + subjective marks, grade, feedback, and checked annotated PDF (when policy allows).
          </li>
        </ol>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
          Honest Capabilities vs. Browser-Only Simulation Limits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Working Client-Side Implementations
            </div>
            <ul className="space-y-1 text-slate-600 dark:text-slate-300 list-disc pl-4">
              <li>IndexedDB state & PDF binary persistence across refresh</li>
              <li>Fixed wall-clock countdown timers (no reset on refresh/late entry)</li>
              <li>PDF.js on-site rendering, text extraction & overlay annotations</li>
              <li>Mammoth DOCX extraction & jsPDF handwritten image-to-PDF assembly</li>
              <li>Pre-publication marks revision governance & post-publication lock</li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <XCircle className="h-4 w-4" />
              Simulated / Client-Only Boundaries
            </div>
            <ul className="space-y-1 text-slate-600 dark:text-slate-300 list-disc pl-4">
              <li>Client-side role guards & demo passwords are NOT production security</li>
              <li>No real BZU database sync, email delivery, or multi-device cloud sync</li>
              <li>Browser focus/visibility warnings cannot stop secondary-device cheating</li>
              <li>No webcam surveillance; speech dictation depends on browser Web Speech API</li>
              <li>Scanned image PDFs or complex LaTeX equations require manual teacher review</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          Reset Local Demo Dataset
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Restore the original 500 students, 25 teachers, 1 admin, sample PDFs, and revision cases in this browser.
        </p>
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Demo Data
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-red-700 dark:text-red-300">
              Confirm wiping all local exam attempts, annotations, and revisions?
            </span>
            <button
              type="button"
              onClick={async () => {
                await resetDemoDataset();
                setConfirmReset(false);
              }}
              className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              Yes, Restore Initial Seed
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-10 max-w-5xl mx-auto">
        {body}
      </div>
    );
  }

  return (
    <DashboardShell title="Prototype & Local Storage Guide" breadcrumb="Documentation · Zero-Budget Demo">
      {body}
    </DashboardShell>
  );
};
