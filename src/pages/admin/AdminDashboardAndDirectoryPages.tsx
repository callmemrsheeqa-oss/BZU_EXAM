import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  GitPullRequest,
  ShieldCheck,
  Users,
  Search,
  Database,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DashboardShell } from '../../components/DashboardShell';
import { StatusLabel } from '../../components/StatusLabel';
import { formatKarachiDateTime, isExamExpired, isExamWindowOpen } from '../../lib/examTimer';

export const AdminDashboardPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'admin') return null;

  const activeExams = db.exams.filter((e) => isExamWindowOpen(e)).length;
  const upcomingExams = db.exams.filter((e) => Date.parse(e.startAt) > Date.now()).length;
  const pastExams = db.exams.filter((e) => isExamExpired(e)).length;
  const pendingRevs = db.revisionRequests.filter((r) => r.status === 'pending');

  return (
    <DashboardShell
      title="Admin Controller Dashboard"
      breadcrumb="Controller of Examinations Demo · Governance & System Overview"
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="text-xs text-slate-500">Seeded Accounts</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
              {db.students.length} / {db.teachers.length} / {db.admins.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Students / Teachers / Admin</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="text-xs text-slate-500">Assessments (Live / Up / Past)</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
              {activeExams} / {upcomingExams} / {pastExams}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across {db.courses.length} courses</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="text-xs text-slate-500">Pending Revision Queue</div>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {pendingRevs.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Holding result publication</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="text-xs text-slate-500">Checked-Paper Visibility</div>
            <div className="mt-1 font-display text-lg font-bold">
              {db.policy.allowStudentCheckedPaperView ? 'Allowed (Global)' : 'Restricted (Hidden)'}
            </div>
            <Link to="/admin/policies" className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
              Configure policy →
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold flex items-center gap-2">
                <GitPullRequest className="h-4 w-4 text-amber-600" />
                Pending Marks Revision Approvals
              </h2>
              <Link to="/admin/revisions" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                Open Queue →
              </Link>
            </div>
            {pendingRevs.length === 0 ? (
              <p className="text-xs text-slate-500">No pending revision requests.</p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {pendingRevs.map((rev) => {
                  const stu = db.students.find((s) => s.id === rev.studentId);
                  const teacher = db.teachers.find((t) => t.id === rev.teacherId);
                  return (
                    <div key={rev.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-mono font-bold">{rev.id} · {stu?.name}</div>
                        <div className="text-slate-500">
                          By {teacher?.name} · Marks: {rev.oldSubjectiveTotal} → {rev.proposedSubjectiveTotal}
                        </div>
                      </div>
                      <Link
                        to="/admin/revisions"
                        className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700"
                      >
                        Review
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                Recent Audit & Incident Events
              </h2>
              <Link to="/admin/incidents" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                Full Audit Log →
              </Link>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {db.auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="py-2.5 text-xs">
                  <div className="font-mono text-[11px] text-slate-500">
                    {log.action} · {formatKarachiDateTime(log.timestamp)}
                  </div>
                  <div className="text-slate-800 dark:text-slate-200">{log.summary}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                Official BZU Calendar (Acad/AC-26/7021)
              </span>
              <Link to="/calendar" className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                View complete academic calendar →
              </Link>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            <Database className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>
              Want to reset all local IndexedDB changes or inspect the 500/25/1 deterministic directory?
            </span>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/accounts" className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold">
              Manage Accounts
            </Link>
            <Link to="/admin/dataset" className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
              Dataset & Reset
            </Link>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
};

export const AdminAccountsPage: React.FC = () => {
  const { db, currentUser, toggleAccountActive } = useAppState();
  const [tab, setTab] = useState<'students' | 'teachers' | 'admins'>('students');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filteredStudents = useMemo(() => {
    if (!db) return [];
    const q = query.trim().toLowerCase();
    if (!q) return db.students;
    return db.students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q)
    );
  }, [db, query]);

  const filteredTeachers = useMemo(() => {
    if (!db) return [];
    const q = query.trim().toLowerCase();
    if (!q) return db.teachers;
    return db.teachers.filter(
      (t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
    );
  }, [db, query]);

  if (!db || !currentUser || currentUser.role !== 'admin') return null;

  const totalStudentsPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safePage = Math.min(page, totalStudentsPages);
  const studentPageRows = filteredStudents.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <DashboardShell title="Synthetic University Accounts Directory" breadcrumb="Admin · 500 Students · 25 Teachers · 1 Admin">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setTab('students');
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === 'students' ? 'bg-white dark:bg-slate-900 shadow-xs' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Students ({db.students.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('teachers')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === 'teachers' ? 'bg-white dark:bg-slate-900 shadow-xs' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Teachers ({db.teachers.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('admins')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === 'admins' ? 'bg-white dark:bg-slate-900 shadow-xs' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Admin ({db.admins.length})
            </button>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, roll no, email..."
              className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-64"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            {tab === 'students' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-500">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Roll No & ID</th>
                    <th className="px-4 py-3">Department / Batch</th>
                    <th className="px-4 py-3">Demo Password</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {studentPageRows.map((s) => {
                    const dept = db.departments.find((d) => d.id === s.departmentId);
                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-xs font-mono text-slate-500">{s.email}</div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          <div>{s.rollNumber}</div>
                          <div className="text-slate-500">{s.studentId}</div>
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {dept?.code} · {s.batch} · Sem {s.semester}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">{s.password}</td>
                        <td className="px-4 py-2.5">
                          <StatusLabel tone={s.active ? 'success' : 'danger'} label={s.active ? 'Active' : 'Suspended'} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => void toggleAccountActive('student', s.id, !s.active)}
                            className="rounded border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-medium"
                          >
                            {s.active ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {tab === 'teachers' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-500">
                    <th className="px-4 py-3">Teacher</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Assigned Courses</th>
                    <th className="px-4 py-3">Demo Password</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredTeachers.map((t) => {
                    const dept = db.departments.find((d) => d.id === t.departmentId);
                    return (
                      <tr key={t.id}>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold">{t.name}</div>
                          <div className="text-xs font-mono text-slate-500">{t.email}</div>
                        </td>
                        <td className="px-4 py-2.5 text-xs">{dept?.code} · {t.title}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{t.assignedCourseIds.length} course(s)</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{t.password}</td>
                        <td className="px-4 py-2.5">
                          <StatusLabel tone={t.active ? 'success' : 'danger'} label={t.active ? 'Active' : 'Suspended'} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => void toggleAccountActive('teacher', t.id, !t.active)}
                            className="rounded border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-medium"
                          >
                            {t.active ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {tab === 'admins' && (
              <div className="p-5 space-y-2 text-sm">
                {db.admins.map((a) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">{a.name} ({a.title})</div>
                      <div className="text-xs font-mono text-slate-500">{a.email} · {a.employeeId}</div>
                    </div>
                    <StatusLabel tone="success" label="Active Controller Demo" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {tab === 'students' && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing page {safePage} of {totalStudentsPages} ({filteredStudents.length} matching students)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-300 dark:border-slate-700 px-3 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={safePage >= totalStudentsPages}
                onClick={() => setPage((p) => Math.min(totalStudentsPages, p + 1))}
                className="rounded border border-slate-300 dark:border-slate-700 px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
};

export const AdminDepartmentsCoursesPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'admin') return null;

  return (
    <DashboardShell title="Departments, Programs & Courses" breadcrumb="Admin · Synthetic Academic Catalog">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {db.departments.map((d) => {
            const deptProgs = db.programs.filter((p) => p.departmentId === d.id);
            const deptCourses = db.courses.filter((c) => c.departmentId === d.id);
            return (
              <div
                key={d.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2"
              >
                <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400">{d.code}</div>
                <h2 className="font-display text-base font-bold">{d.name}</h2>
                <div className="text-xs text-slate-500">{d.faculty}</div>
                <div className="text-xs pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {deptProgs.length} Program(s)</span>
                  <span>·</span>
                  <span>{deptCourses.length} Course(s)</span>
                </div>
              </div>
            );
          })}
        </div>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 font-display font-bold text-base">
            Seeded Courses ({db.courses.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-500">
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5">Course Title</th>
                  <th className="px-4 py-2.5">Instructor</th>
                  <th className="px-4 py-2.5">Semester / Sec</th>
                  <th className="px-4 py-2.5 text-right">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {db.courses.map((c) => {
                  const teacher = db.teachers.find((t) => t.id === c.teacherId);
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold">{c.code}</td>
                      <td className="px-4 py-2.5">{c.title}</td>
                      <td className="px-4 py-2.5 text-xs">{teacher?.name}</td>
                      <td className="px-4 py-2.5 text-xs">Sem {c.semesterNumber} · Sec {c.section}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{c.creditHours}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
};
