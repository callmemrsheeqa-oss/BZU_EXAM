import React, { useMemo, useState } from 'react';
import { CalendarDays, List, Grid3X3, Info, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BZU_ACADEMIC_CALENDAR,
  BZU_CALENDAR_METADATA,
  BZU_SEMESTER_TABS,
  getCalendarEventStatus,
  type AcademicSemesterId,
} from '../data/bzuAcademicCalendar';
import {
  formatKarachiDateOnly,
  formatKarachiDateTime,
  getTodayKarachiYmd,
} from '../lib/examTimer';
import { useAppState } from '../context/AppStateContext';
import { DashboardShell } from '../components/DashboardShell';
import { StatusLabel } from '../components/StatusLabel';

export const AcademicCalendarPage: React.FC = () => {
  const { db, currentUser } = useAppState();
  const [selectedSemester, setSelectedSemester] = useState<AcademicSemesterId>('fall-2026');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const todayKarachiYmd = getTodayKarachiYmd();

  const semesterEvents = useMemo(
    () => BZU_ACADEMIC_CALENDAR.filter((ev) => ev.semesterId === selectedSemester),
    [selectedSemester]
  );

  const syntheticSlotsForSemester = useMemo(
    () =>
      (db?.exams ?? []).filter(
        (ex) => ex.semesterCalendarRef === selectedSemester || (selectedSemester === 'fall-2026' && ex.isInteractiveSandbox)
      ),
    [db, selectedSemester]
  );

  // Build month blocks for calendar grid view
  const monthBlocks = useMemo(() => {
    const monthsBySem: Record<AcademicSemesterId, string[]> = {
      'fall-2026': ['2026-08', '2026-10', '2026-12', '2027-01'],
      'spring-2027': ['2027-01', '2027-03', '2027-04', '2027-06', '2027-07', '2027-08'],
      'summer-2027': ['2027-06', '2027-07', '2027-08'],
    };
    return monthsBySem[selectedSemester].map((ym) => {
      const [yStr, mStr] = ym.split('-');
      const year = Number(yStr);
      const monthIndex = Number(mStr) - 1;
      const firstDay = new Date(year, monthIndex, 1);
      const startWeekday = firstDay.getDay();
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const label = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const cells: Array<{ day: number | null; ymd: string | null }> = [];
      for (let i = 0; i < startWeekday; i++) cells.push({ day: null, ymd: null });
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push({
          day: d,
          ymd: `${yStr}-${mStr}-${String(d).padStart(2, '0')}`,
        });
      }
      return { ym, label, cells };
    });
  }, [selectedSemester]);

  const content = (
    <div className="space-y-6">
      {!currentUser && (
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Timezone: Asia/Karachi (PKT)
          </span>
        </div>
      )}

      {/* Official Source Attribution Banner */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {BZU_CALENDAR_METADATA.university} — Official Academic Calendar (Read-Only Reference)
          </h2>
          <span className="font-mono text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Notification No. {BZU_CALENDAR_METADATA.notificationNumber} · {BZU_CALENDAR_METADATA.notificationDateDisplay}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {BZU_CALENDAR_METADATA.attributionLine} Supersedes notification{' '}
          <span className="font-mono">{BZU_CALENDAR_METADATA.supersedesNumber}</span> dated{' '}
          <span className="font-mono">{BZU_CALENDAR_METADATA.supersedesDate}</span>.
        </p>
        <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 pt-1">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{BZU_CALENDAR_METADATA.disclaimerLine}</span>
        </p>
      </div>

      {/* Semester Tabs & List/Calendar Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
          {BZU_SEMESTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedSemester(tab.id)}
              className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedSemester === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            List View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            Calendar View
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Official Calendar Event</th>
                  <th className="px-4 py-3 whitespace-nowrap">Audience</th>
                  <th className="px-4 py-3 whitespace-nowrap">Start Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">End Date (Inclusive)</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status ({todayKarachiYmd})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {semesterEvents.map((ev) => {
                  const status = getCalendarEventStatus(ev, todayKarachiYmd);
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {ev.title}
                        </div>
                        {ev.notes && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {ev.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {ev.audience}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div>{formatKarachiDateOnly(ev.startDate)}</div>
                        <div className="text-[11px] text-slate-400">{ev.startDate}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div>{formatKarachiDateOnly(ev.endDate)}</div>
                        <div className="text-[11px] text-slate-400">{ev.endDate}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusLabel
                          tone={
                            status === 'current'
                              ? 'success'
                              : status === 'upcoming'
                                ? 'info'
                                : 'neutral'
                          }
                          label={
                            status === 'current'
                              ? 'Active Official Window'
                              : status === 'upcoming'
                                ? 'Upcoming Window'
                                : 'Historical / Passed'
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {monthBlocks.map((mb) => (
            <div
              key={mb.ym}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
            >
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                {mb.label}
              </h3>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-1">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {mb.cells.map((cell, idx) => {
                  if (!cell.day || !cell.ymd) {
                    return <div key={`empty-${idx}`} className="h-8" />;
                  }
                  const matching = semesterEvents.filter(
                    (ev) => cell.ymd! >= ev.startDate && cell.ymd! <= ev.endDate
                  );
                  const hasExam = matching.some(
                    (m) => m.eventType === 'midterm' || m.eventType === 'final'
                  );
                  const hasResult = matching.some((m) => m.eventType === 'results');
                  const hasVacation = matching.some(
                    (m) => m.eventType === 'vacation' || m.eventType === 'sports'
                  );
                  const hasCommence = matching.some((m) => m.eventType === 'commencement');

                  let cellCls = 'text-slate-700 dark:text-slate-300';
                  if (hasExam) {
                    cellCls = 'bg-emerald-600 text-white font-semibold';
                  } else if (hasResult) {
                    cellCls = 'bg-amber-600 text-white font-semibold';
                  } else if (hasCommence) {
                    cellCls = 'bg-sky-600 text-white font-semibold';
                  } else if (hasVacation) {
                    cellCls = 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
                  }

                  return (
                    <div
                      key={cell.ymd}
                      title={matching.map((m) => m.title).join(', ') || cell.ymd}
                      className={`h-8 rounded flex items-center justify-center font-mono text-xs tabular-nums ${cellCls}`}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Synthetic Subject-Specific Demo Exam Slots */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            Synthetic Subject-Specific Demo Slots ({selectedSemester.toUpperCase()})
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Demo exam slots — not an official BZU date sheet
          </span>
        </div>

        {syntheticSlotsForSemester.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No synthetic subject slots seeded for this semester tab yet. Teachers can create slots in Exam Builder.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {syntheticSlotsForSemester.map((ex) => {
              const course = db?.courses.find((c) => c.id === ex.courseId);
              return (
                <div key={ex.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {course?.code} · {ex.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {ex.isDemoSlotLabel} · {ex.type} · Section {ex.section}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums text-right">
                    <div>{formatKarachiDateTime(ex.startAt)} → {formatKarachiDateTime(ex.endAt)}</div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400">
                      Demo time (Asia/Karachi)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-10 max-w-6xl mx-auto">
        {content}
      </div>
    );
  }

  return (
    <DashboardShell
      title="Official BZU Academic Calendar"
      breadcrumb="Reference Schedule · Notification No. Acad/AC-26/7021"
    >
      {content}
    </DashboardShell>
  );
};
