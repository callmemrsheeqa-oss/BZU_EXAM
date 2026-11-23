import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GitPullRequest,
  Users,
  Search,
  PenSquare,
  Play,
  Rocket,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DashboardShell } from '../../components/DashboardShell';
import { StatusLabel, examStatusTone } from '../../components/StatusLabel';
import { getTeacherScopedCourses, getTeacherScopedStudents } from '../../lib/permissions';
import { formatKarachiDateTime, isExamWindowOpen } from '../../lib/examTimer';

export const TeacherDashboardPage: React.FC = () => {
  const { db, currentUser, startDemoExamNow } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'teacher') return null;

  const myCourses = getTeacherScopedCourses(currentUser, db.courses);
  const myStudents = getTeacherScopedStudents(currentUser, db.students);
  const myCourseIds = new Set(myCourses.map((c) => c.id));
  const myExams = db.exams.filter((e) => myCourseIds.has(e.courseId));
  const myExamIds = new Set(myExams.map((e) => e.id));
  const mySubmissions = db.submissions.filter((s) => myExamIds.has(s.examId) && s.isFinalized);
  const uncheckedCount = mySubmissions.filter((s) => !s.initialMarksSaved).length;
  const pendingRevisions = db.revisionRequests.filter(
    (r) => r.teacherId === currentUser.id && r.status === 'pending'
  );

  return (
    <DashboardShell
      title="Teacher Dashboard"
      breadcrumb={`Faculty Demo · ${currentUser.title} · Scoped to Assigned Courses`}
    >
      <div className="space-y-6">
        {/* Demo Actions Bar */}
        <section className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Interactive Demo Examination Controls
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Create and launch demo exams immediately without altering the official BZU Fall 2026 / Spring 2027 / Summer 2027 calendar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/teacher/exam-builder?demo=1"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <PenSquare className="h-3.5 w-3.5" />
              Create Demo Exam
            </Link>
            <Link
              to="/teacher/submissions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ClipboardCheck className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              Demo Exam Submissions
            </Link>
            <Link
              to="/demo-control"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100"
            >
              <Rocket className="h-3.5 w-3.5" />
              Demo Control Panel
            </Link>
          </div>
        </section>

        {/* Metrics Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">Assigned Courses</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{myCourses.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">Scoped Enrolled Students</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{myStudents.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">Unchecked Submissions</div>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {uncheckedCount}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">Pending Revision Holds</div>
            <div className="mt-1 font-mono text-2xl font-bold text-red-700 dark:text-red-400 tabular-nums">
              {pendingRevisions.length}
            </div>
          </div>
        </section>

        {/* Exam & Submission Progress Monitor */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">
              Exam Conduct & Submission Progress Monitor
            </h2>
            <Link to="/teacher/publish" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
              Results Publisher →
            </Link>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {myExams.map((ex) => {
              const course = db.courses.find((c) => c.id === ex.courseId);
              const enrolledForCourse = myStudents.filter((s) =>
                s.enrolledCourseIds.includes(ex.courseId)
              ).length;
              const subs = db.submissions.filter((s) => s.examId === ex.id);
              const finalized = subs.filter((s) => s.isFinalized).length;
              const checked = subs.filter((s) => s.initialMarksSaved).length;
              const published = subs.filter((s) => s.resultPublished).length;
              const live = isExamWindowOpen(ex) && ex.isPublishedToStudents;

              return (
                <div key={ex.id} className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-mono text-emerald-700 dark:text-emerald-400">
                      {course?.code} · {ex.type} · {ex.durationMinutes ? `${ex.durationMinutes} min` : 'Scheduled Window'}
                    </div>
                    <div className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                      {ex.title}
                    </div>
                    <div className="font-mono text-slate-500 tabular-nums">
                      Enrolled: {enrolledForCourse} · Submitted: {finalized} · Checked: {checked} · Published: {published}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusLabel
                      tone={live ? 'success' : ex.isPublishedToStudents ? 'info' : 'neutral'}
                      label={live ? 'Live Now' : ex.isPublishedToStudents ? 'Scheduled' : 'Draft'}
                    />
                    {!live && (
                      <button
                        type="button"
                        onClick={() => void startDemoExamNow(ex.id, ex.durationMinutes ?? 45)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800"
                      >
                        <Play className="h-3 w-3" />
                        Start Demo Exam Now
                      </button>
                    )}
                    <Link
                      to={`/teacher/submissions?examId=${ex.id}`}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Submissions
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                Submissions Queue (Assigned Courses)
              </h2>
              <Link to="/teacher/submissions" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                Open Paper Checker →
              </Link>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {mySubmissions.slice(0, 5).map((sub) => {
                const student = db.students.find((s) => s.id === sub.studentId);
                const exam = db.exams.find((e) => e.id === sub.examId);
                return (
                  <div key={sub.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{student?.name} ({student?.rollNumber})</div>
                      <div className="text-xs text-slate-500 truncate">{exam?.title}</div>
                    </div>
                    <StatusLabel
                      tone={sub.resultPublished ? 'success' : sub.initialMarksSaved ? 'info' : 'warning'}
                      label={
                        sub.resultPublished
                          ? 'Published'
                          : sub.initialMarksSaved
                            ? 'Initial Marks Saved'
                            : 'Needs Grading'
                      }
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold flex items-center gap-2">
                <GitPullRequest className="h-4 w-4 text-amber-600" />
                Marks Revision Governance
              </h2>
              <Link to="/teacher/revisions" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                My Requests →
              </Link>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {db.revisionRequests
                .filter((r) => r.teacherId === currentUser.id)
                .slice(0, 4)
                .map((rev) => {
                  const stu = db.students.find((s) => s.id === rev.studentId);
                  return (
                    <div key={rev.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-mono font-semibold">{rev.id} · {stu?.name}</div>
                        <div className="text-slate-500">
                          Subjective Marks: {rev.oldSubjectiveTotal} → {rev.proposedSubjectiveTotal}
                        </div>
                      </div>
                      <StatusLabel tone={examStatusTone(rev.status)} label={rev.status.toUpperCase()} />
                    </div>
                  );
                })}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                Official BZU Academic Calendar
              </span>
              <Link to="/calendar" className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                View complete academic calendar →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
};

export const TeacherCoursesPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'teacher') return null;

  const courses = getTeacherScopedCourses(currentUser, db.courses);
  const scopedStudents = getTeacherScopedStudents(currentUser, db.students);

  return (
    <DashboardShell title="My Assigned Courses & Classes" breadcrumb="Teacher · Course Isolation Policy">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => {
          const enrolledCount = scopedStudents.filter((s) => s.enrolledCourseIds.includes(c.id)).length;
          const examCount = db.exams.filter((e) => e.courseId === c.id).length;
          return (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-mono text-emerald-700 dark:text-emerald-400">
                <span>{c.code} · Sec {c.section}</span>
                <span>{c.creditHours} Cr</span>
              </div>
              <h2 className="font-display text-base font-bold">{c.title}</h2>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {enrolledCount} Students</span>
                <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {examCount} Assessments</span>
              </div>
              <div className="pt-2 flex gap-2">
                <Link
                  to="/teacher/exam-builder"
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Create Exam
                </Link>
                <Link
                  to="/teacher/submissions"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium"
                >
                  Check Papers
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
};

export const TeacherStudentsPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  const [query, setQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const myCourses = useMemo(
    () => (db && currentUser?.role === 'teacher' ? getTeacherScopedCourses(currentUser, db.courses) : []),
    [db, currentUser]
  );
  const myStudents = useMemo(
    () => (db && currentUser?.role === 'teacher' ? getTeacherScopedStudents(currentUser, db.students) : []),
    [db, currentUser]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return myStudents.filter((stu) => {
      if (courseFilter !== 'all' && !stu.enrolledCourseIds.includes(courseFilter)) return false;
      if (!q) return true;
      return (
        stu.name.toLowerCase().includes(q) ||
        stu.rollNumber.toLowerCase().includes(q) ||
        stu.email.toLowerCase().includes(q)
      );
    });
  }, [myStudents, courseFilter, query]);

  if (!db || !currentUser || currentUser.role !== 'teacher') return null;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <DashboardShell
      title="Enrolled Students (Assigned Courses Only)"
      breadcrumb="Teacher · Strict Subject-Scoped Access (Unrelated Transcripts Hidden)"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search roll no, name, email..."
                className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-64"
              />
            </div>

            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by assigned course"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
            >
              <option value="all">All Assigned Courses ({myCourses.length})</option>
              {myCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-slate-500">
            Showing {filtered.length} enrolled student(s) in your courses
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-500">
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Roll Number</th>
                  <th className="px-4 py-3">Batch / Sem / Sec</th>
                  <th className="px-4 py-3">Assigned Subject(s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {pageItems.map((stu) => {
                  const relevantCourses = myCourses.filter((c) =>
                    stu.enrolledCourseIds.includes(c.id)
                  );
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{stu.name}</div>
                        <div className="text-xs font-mono text-slate-500">{stu.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{stu.rollNumber}</td>
                      <td className="px-4 py-3 text-xs">
                        {stu.batch} · Sem {stu.semester} · Sec {stu.section}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {relevantCourses.map((c) => c.code).join(', ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {safePage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export const TeacherSchedulePage: React.FC = () => {
  const { db, currentUser, startDemoExamNow } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'teacher') return null;
  const myCourses = getTeacherScopedCourses(currentUser, db.courses);
  const myCourseIds = new Set(myCourses.map((c) => c.id));
  const myExams = db.exams.filter((e) => myCourseIds.has(e.courseId));

  return (
    <DashboardShell title="My Course Exam Schedule" breadcrumb="Teacher · Demo Slots (Asia/Karachi)">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            All times shown in Asia/Karachi as synthetic demo exam slots. Official semester date windows remain read-only.
          </p>
          <Link
            to="/teacher/exam-builder?demo=1"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            + Create Demo Exam
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
          {myExams.map((ex) => {
            const c = db.courses.find((x) => x.id === ex.courseId);
            const live = isExamWindowOpen(ex) && ex.isPublishedToStudents;
            return (
              <div key={ex.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                    {c?.code} · {ex.type} · {ex.isDemoSlotLabel}
                  </div>
                  <div className="font-display font-bold text-base">{ex.title}</div>
                  <div className="text-xs font-mono text-slate-500">
                    {formatKarachiDateTime(ex.startAt)} → {formatKarachiDateTime(ex.endAt)} · {ex.totalMarks} marks
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <StatusLabel
                    tone={live ? 'success' : ex.isPublishedToStudents ? 'info' : 'neutral'}
                    label={live ? 'Live Now' : ex.isPublishedToStudents ? 'Published to Students' : 'Draft'}
                  />
                  {!live && (
                    <button
                      type="button"
                      onClick={() => void startDemoExamNow(ex.id, ex.durationMinutes ?? 45)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <Play className="h-3 w-3" />
                      Start Demo Exam Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
};
