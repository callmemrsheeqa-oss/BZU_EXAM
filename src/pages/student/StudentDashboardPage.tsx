import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, Award, BookOpen, Bell, Play } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DashboardShell } from '../../components/DashboardShell';
import { StatusLabel, examStatusTone } from '../../components/StatusLabel';
import {
  deriveAssignmentStatus,
  deriveExamLifecycleStatus,
  formatKarachiDateTime,
  isExamWindowOpen,
} from '../../lib/examTimer';
import { computeCombinedMarks, computeLetterGrade } from '../../lib/gradeMath';

export const StudentDashboardPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  if (!db || !currentUser || currentUser.role !== 'student') return null;

  const dept = db.departments.find((d) => d.id === currentUser.departmentId);
  const program = db.programs.find((p) => p.id === currentUser.programId);
  const enrolledCourses = db.courses.filter((c) => currentUser.enrolledCourseIds.includes(c.id));

  const studentExams = db.exams.filter(
    (ex) => ex.isPublishedToStudents && currentUser.enrolledCourseIds.includes(ex.courseId)
  );
  const availableDemoExams = studentExams.filter(
    (ex) => ex.isDemoExam || ex.isInteractiveSandbox || isExamWindowOpen(ex)
  );

  const studentAssignments = db.assignments.filter((a) =>
    currentUser.enrolledCourseIds.includes(a.courseId)
  );

  const publishedSubs = db.submissions.filter(
    (s) => s.studentId === currentUser.id && s.resultPublished
  );

  const myNotifs = db.notifications
    .filter((n) => n.recipientId === currentUser.id || n.roleScope === 'student')
    .slice(0, 3);

  return (
    <DashboardShell
      title="Student Dashboard"
      breadcrumb={`Student Demo · ${dept?.code ?? 'BZU'} · ${currentUser.rollNumber}`}
    >
      <div className="space-y-6">
        {/* Profile Summary Card */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
              style={{ backgroundColor: currentUser.avatarColor }}
            >
              {currentUser.avatarInitials}
            </div>
            <div>
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Synthetic Student Record · {currentUser.studentId}
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {currentUser.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                <span>{program?.name}</span>
                <span aria-hidden="true">·</span>
                <span>Batch {currentUser.batch}</span>
                <span aria-hidden="true">·</span>
                <span>Semester {currentUser.semester} (Sec {currentUser.section})</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{currentUser.rollNumber}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Mock CGPA</div>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {currentUser.cgpa.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Enrolled</div>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {enrolledCourses.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Results</div>
              <div className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {publishedSubs.length}
              </div>
            </div>
          </div>
        </section>

        {/* Primary Focal Anchor: Available Demo Exams */}
        <section className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Interactive Demo Testing · Independent of Official BZU Calendar
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Available Demo Exams ({availableDemoExams.length})
              </h3>
            </div>
            <Link
              to="/student/exams"
              className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline"
            >
              View All Course Exams →
            </Link>
          </div>

          {availableDemoExams.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              No demo exams are currently live. Switch to Teacher or open Demo Control Panel to create and start a demo exam anytime.
            </p>
          ) : (
            <div className="space-y-3">
              {availableDemoExams.map((demoEx) => {
                const course = db.courses.find((c) => c.id === demoEx.courseId);
                const sub = db.submissions.find(
                  (s) => s.examId === demoEx.id && s.studentId === currentUser.id
                );
                const status = deriveExamLifecycleStatus(demoEx, sub);
                const canStart = isExamWindowOpen(demoEx) && !sub?.isFinalized;

                return (
                  <div
                    key={demoEx.id}
                    className="rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                        {course?.code} · {demoEx.type} · {demoEx.durationMinutes ? `${demoEx.durationMinutes} min duration` : demoEx.isDemoSlotLabel}
                      </div>
                      <div className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                        {demoEx.title}
                      </div>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        Window: {formatKarachiDateTime(demoEx.startAt)} → {formatKarachiDateTime(demoEx.endAt)} · {demoEx.totalMarks} Marks
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <StatusLabel tone={examStatusTone(status)} label={status} />
                      {canStart ? (
                        <Link
                          to={`/student/exams/${demoEx.id}/instructions`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          <Play className="h-3.5 w-3.5" />
                          {sub ? 'Resume Exam' : 'Start Exam'}
                        </Link>
                      ) : (
                        <Link
                          to={`/student/exams/${demoEx.id}/instructions`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Open Details
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Grid: Exams & Assignments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exams List */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                My Course Exams
              </h3>
              <Link to="/student/exams" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {studentExams.map((ex) => {
                const course = db.courses.find((c) => c.id === ex.courseId);
                const sub = db.submissions.find(
                  (s) => s.examId === ex.id && s.studentId === currentUser.id
                );
                const status = deriveExamLifecycleStatus(ex, sub);
                return (
                  <div key={ex.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {course?.code} · {ex.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {formatKarachiDateTime(ex.startAt)} · {ex.totalMarks} marks
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusLabel tone={examStatusTone(status)} label={status} />
                      <Link
                        to={`/student/exams/${ex.id}/instructions`}
                        className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Assignments & Recent Results */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Assignments & Deadlines
              </h3>
              <Link to="/student/assignments" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                Manage
              </Link>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {studentAssignments.map((asg) => {
                const sub = db.assignmentSubmissions.find(
                  (s) => s.assignmentId === asg.id && s.studentId === currentUser.id
                );
                const status = deriveAssignmentStatus(asg, sub);
                return (
                  <div key={asg.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {asg.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Due: {formatKarachiDateTime(asg.dueAt)}
                      </div>
                    </div>
                    <StatusLabel tone={examStatusTone(status)} label={status} />
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                <span>BZU Notification No. Acad/AC-26/7021</span>
              </div>
              <Link
                to="/calendar"
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                View complete academic calendar →
              </Link>
            </div>
          </section>
        </div>

        {/* Bottom Grid: Published Results & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                Recent Published Results
              </h3>
              <Link to="/student/results" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                Full Results
              </Link>
            </div>
            {publishedSubs.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No published exam results yet.</p>
            ) : (
              publishedSubs.map((sub) => {
                const exam = db.exams.find((e) => e.id === sub.examId);
                const qs = exam ? db.questions.filter((q) => exam.questionIds.includes(q.id)) : [];
                const marks = computeCombinedMarks(sub, qs);
                const grade = computeLetterGrade(marks.totalObtained, marks.totalMax);
                return (
                  <div key={sub.id} className="flex items-center justify-between py-2 text-sm border-b last:border-b-0 border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{exam?.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Published {sub.resultPublishedAt ? formatKarachiDateTime(sub.resultPublishedAt) : ''}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">
                        {marks.totalObtained} / {marks.totalMax} ({grade.letter})
                      </div>
                      <div className="text-xs text-slate-500">{grade.percentage}%</div>
                    </div>
                  </div>
                );
              })
            )}
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Recent Notifications
              </h3>
              <Link to="/notifications" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                Inbox
              </Link>
            </div>
            <div className="space-y-2">
              {myNotifs.map((n) => (
                <div key={n.id} className="text-xs border-b last:border-b-0 border-slate-200 dark:border-slate-800 pb-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{n.title}</div>
                  <div className="text-slate-600 dark:text-slate-400">{n.message}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
};
