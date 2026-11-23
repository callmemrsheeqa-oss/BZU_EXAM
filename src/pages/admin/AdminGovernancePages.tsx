import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  CalendarClock,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DashboardShell } from '../../components/DashboardShell';
import { StatusLabel, examStatusTone } from '../../components/StatusLabel';
import { formatKarachiDateTime } from '../../lib/examTimer';

export const AdminRevisionQueuePage: React.FC = () => {
  const { db, currentUser, resolveMarksRevision } = useAppState();
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (!db || !currentUser || currentUser.role !== 'admin') return null;

  return (
    <DashboardShell
      title="Marks Revision Approval Queue"
      breadcrumb="Admin · Pre-Publication Governance & Audit Trail"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Approving a pending revision applies the teacher’s proposed marks and unlocks result publication. Rejecting retains the original saved marks.
        </p>

        {db.revisionRequests.map((rev) => {
          const stu = db.students.find((s) => s.id === rev.studentId);
          const teacher = db.teachers.find((t) => t.id === rev.teacherId);
          const exam = db.exams.find((e) => e.id === rev.examId);
          const course = db.courses.find((c) => c.id === rev.courseId);

          return (
            <div
              key={rev.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-slate-500">
                    {rev.id} · {course?.code} · Requested {formatKarachiDateTime(rev.requestedAt)}
                  </div>
                  <h2 className="font-display text-base font-bold">
                    {stu?.name} ({stu?.rollNumber}) — {exam?.title}
                  </h2>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Requested by: {teacher?.name}
                  </div>
                </div>
                <StatusLabel tone={examStatusTone(rev.status)} label={rev.status.toUpperCase()} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs">
                <div>
                  <span className="text-slate-500">Current Saved Subjective Marks:</span>{' '}
                  <strong className="font-mono">{rev.oldSubjectiveTotal}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Proposed New Subjective Marks:</span>{' '}
                  <strong className="font-mono text-amber-700 dark:text-amber-400">
                    {rev.proposedSubjectiveTotal}
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Teacher Justification:</span> {rev.justification}
                </div>
              </div>

              {rev.status === 'pending' ? (
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <input
                    type="text"
                    value={notes[rev.id] ?? ''}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [rev.id]: e.target.value }))
                    }
                    placeholder="Enter Admin decision note (e.g., Verified annotation on PDF)..."
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void resolveMarksRevision(
                          rev.id,
                          'approved',
                          notes[rev.id] || 'Approved after verification.'
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void resolveMarksRevision(
                          rev.id,
                          'rejected',
                          notes[rev.id] || 'Rejected; original marks retained.'
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  <strong>Decision Note ({rev.decidedAt ? formatKarachiDateTime(rev.decidedAt) : ''}):</strong>{' '}
                  {rev.decisionNote}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
};

export const AdminScheduleReschedulePage: React.FC = () => {
  const { db, currentUser, rescheduleExamWindow, pushToast } = useAppState();
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [reason, setReason] = useState('');

  if (!db || !currentUser || currentUser.role !== 'admin') return null;

  const openEditor = (examId: string, curStart: string, curEnd: string) => {
    setEditingExamId(examId);
    setStartInput(new Date(curStart).toISOString().slice(0, 16));
    setEndInput(new Date(curEnd).toISOString().slice(0, 16));
    setReason('');
  };

  const handleSave = async (examId: string) => {
    if (!reason.trim()) {
      pushToast('error', 'Please record a reason for rescheduling this exam slot.');
      return;
    }
    const newStartIso = new Date(startInput).toISOString();
    const newEndIso = new Date(endInput).toISOString();
    if (Date.parse(newEndIso) <= Date.parse(newStartIso)) {
      pushToast('error', 'End time must be after start time.');
      return;
    }
    await rescheduleExamWindow(examId, newStartIso, newEndIso, reason);
    setEditingExamId(null);
  };

  return (
    <DashboardShell
      title="Exam Calendar & Rescheduling"
      breadcrumb="Admin · Synthetic Exam Slots (Official BZU Dates Read-Only)"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
          {db.exams.map((ex) => {
            const c = db.courses.find((x) => x.id === ex.courseId);
            const isEditing = editingExamId === ex.id;

            return (
              <div key={ex.id} className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                      {c?.code} · {ex.type} · {ex.isDemoSlotLabel}
                    </div>
                    <h2 className="font-display text-base font-bold">{ex.title}</h2>
                    <div className="text-xs font-mono text-slate-500">
                      {formatKarachiDateTime(ex.startAt)} → {formatKarachiDateTime(ex.endAt)} (Asia/Karachi)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      isEditing ? setEditingExamId(null) : openEditor(ex.id, ex.startAt, ex.endAt)
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold"
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    {isEditing ? 'Cancel' : 'Reschedule Slot'}
                  </button>
                </div>

                {isEditing && (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">New Start (UTC/Local ISO)</label>
                        <input
                          type="datetime-local"
                          value={startInput}
                          onChange={(e) => setStartInput(e.target.value)}
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">New End</label>
                        <input
                          type="datetime-local"
                          value={endInput}
                          onChange={(e) => setEndInput(e.target.value)}
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Recorded rescheduling reason (e.g., Gazette holiday conflict)..."
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSave(ex.id)}
                      className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Save New Window
                    </button>
                  </div>
                )}

                {ex.rescheduleHistory.length > 0 && (
                  <div className="text-xs text-slate-500 space-y-1 pt-1">
                    {ex.rescheduleHistory.map((h) => (
                      <div key={h.id}>
                        Rescheduled on {formatKarachiDateTime(h.changedAt)} by {h.changedBy}: {h.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
};

export const AdminPoliciesPage: React.FC = () => {
  const { db, currentUser, updateCheckedPaperPolicy } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'admin') return null;

  const globalAllow = db.policy.allowStudentCheckedPaperView;
  const overrides = db.policy.perStudentCheckedPaperOverrides;

  return (
    <DashboardShell
      title="Result Publication & Checked-Paper Policy"
      breadcrumb="Admin · University Demo Permission Governance"
    >
      <div className="max-w-3xl space-y-6">
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                Global Student Checked-Paper Visibility Toggle
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Controls whether students can open their teacher-annotated checked PDFs after results are published. Teachers cannot bypass this Admin policy.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void updateCheckedPaperPolicy(!globalAllow)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shrink-0 ${
                globalAllow ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {globalAllow ? 'Currently: ALLOWED (Click to Restrict)' : 'Currently: RESTRICTED (Click to Allow)'}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <h3 className="font-display text-sm font-bold">
            Per-Student Checked-Paper Visibility Override (Demo Sample Students)
          </h3>
          <p className="text-xs text-slate-500">
            Override global visibility for specific students (e.g., Ayesha Gillani — student001).
          </p>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {db.students.slice(0, 5).map((stu) => {
              const hasOverride = stu.id in overrides;
              const effective = hasOverride ? overrides[stu.id] : globalAllow;
              return (
                <div key={stu.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold">{stu.name}</span>{' '}
                    <span className="font-mono text-slate-500">({stu.rollNumber})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusLabel
                      tone={effective ? 'success' : 'warning'}
                      label={effective ? 'Can View Checked PDF' : 'PDF Hidden'}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void updateCheckedPaperPolicy(globalAllow, {
                          ...overrides,
                          [stu.id]: !effective,
                        })
                      }
                      className="rounded border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-medium"
                    >
                      Toggle Override
                    </button>
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

export const AdminIncidentsAuditPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'admin') return null;

  const allIncidents = db.submissions.flatMap((sub) =>
    sub.incidents.map((inc) => ({ inc, sub }))
  );

  return (
    <DashboardShell title="Integrity Incidents & System Audit Logs" breadcrumb="Admin · Local Demo Telemetry">
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="font-display text-base font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Exam Tab-Visibility & Focus Incidents ({allIncidents.length})
          </h2>
          {allIncidents.length === 0 ? (
            <p className="text-xs text-slate-500">No focus incidents recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {allIncidents.map(({ inc }) => {
                const stu = db.students.find((s) => s.id === inc.studentId);
                const ex = db.exams.find((e) => e.id === inc.examId);
                return (
                  <div key={inc.id} className="py-2.5 flex flex-wrap justify-between gap-2">
                    <div>
                      <strong>{stu?.name} ({stu?.rollNumber})</strong> · {ex?.title}
                      <div className="text-slate-500">{inc.detail}</div>
                    </div>
                    <span className="font-mono text-slate-500">
                      {formatKarachiDateTime(inc.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="font-display text-base font-bold">Audit Log History ({db.auditLogs.length})</h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {db.auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex flex-wrap justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mr-2">
                    {log.action}
                  </span>
                  <span>{log.summary}</span>
                </div>
                <span className="font-mono text-slate-500">
                  {formatKarachiDateTime(log.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
};

export const AdminDatasetResetPage: React.FC = () => {
  const { db, currentUser, resetDemoDataset } = useAppState();
  const [confirming, setConfirming] = useState(false);

  if (!db || !currentUser || currentUser.role !== 'admin') return null;

  return (
    <DashboardShell title="Demo Dataset & Reset Control" breadcrumb="Admin · Local IndexedDB Seed Manager">
      <div className="max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="font-display text-lg font-bold">Seeded Synthetic University State</h2>
        <dl className="grid grid-cols-2 gap-4 text-xs border-y border-slate-200 dark:border-slate-800 py-4 font-mono">
          <div>
            <dt className="text-slate-500">Students</dt>
            <dd className="text-base font-bold">{db.students.length}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Teachers</dt>
            <dd className="text-base font-bold">{db.teachers.length}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Submissions</dt>
            <dd className="text-base font-bold">{db.submissions.length}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Revision Requests</dt>
            <dd className="text-base font-bold">{db.revisionRequests.length}</dd>
          </div>
        </dl>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Reset Entire Demo Dataset
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-red-700 dark:text-red-300">
              Confirm resetting all local IndexedDB data back to initial fixtures?
            </span>
            <button
              type="button"
              onClick={async () => {
                await resetDemoDataset();
                setConfirming(false);
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Confirm Reset
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
};
