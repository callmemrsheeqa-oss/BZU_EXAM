export type AcademicSemesterId = 'fall-2026' | 'spring-2027' | 'summer-2027';

export type AcademicEventType =
  | 'commencement'
  | 'midterm'
  | 'final'
  | 'results'
  | 'vacation'
  | 'sports';

export interface BzuAcademicCalendarEvent {
  id: string;
  semesterId: AcademicSemesterId;
  semesterLabel: string;
  title: string;
  audience: string;
  eventType: AcademicEventType;
  startDate: string; // YYYY-MM-DD (exact official date)
  endDate: string; // YYYY-MM-DD (inclusive)
  sourceNotificationNumber: string;
  sourceNotificationDate: string;
  supersedesNotificationNumber: string;
  supersedesNotificationDate: string;
  sourceType: 'user-supplied-notification';
  notes?: string;
}

export const BZU_CALENDAR_METADATA = {
  university: 'Bahauddin Zakariya University (BZU), Multan',
  notificationNumber: 'Acad/AC-26/7021',
  notificationDate: '2026-08-18',
  notificationDateDisplay: '18 Aug 2026',
  supersedesNumber: 'Acad/AC-26/5759',
  supersedesDate: '2026-07-31',
  attributionLine:
    'Academic calendar based on BZU notification No. Acad/AC-26/7021 dated 18 Aug 2026 (demo reproduction).',
  disclaimerLine:
    'Official calendar dates are reproduced read-only from the supplied notification. Individual course exam slots, hours (Asia/Karachi), student records, and marks are SYNTHETIC demo fixtures.',
};

export const BZU_SEMESTER_TABS: Array<{
  id: AcademicSemesterId;
  label: string;
  audience: string;
}> = [
  { id: 'fall-2026', label: 'Fall Semester 2026', audience: 'Morning / Evening' },
  { id: 'spring-2027', label: 'Spring Semester 2027', audience: 'Morning / Evening' },
  { id: 'summer-2027', label: 'Summer Semester 2027', audience: 'Summer Term' },
];

/**
 * Exact transcribed official BZU Academic Calendar entries.
 * Note: Overlapping Summer Semester 2027 and Summer Vacations 2027 ranges
 * from Notification No. Acad/AC-26/7021 are preserved verbatim as separate entries.
 */
export const BZU_ACADEMIC_CALENDAR: BzuAcademicCalendarEvent[] = [
  // FALL SEMESTER 2026 (Morning/Evening)
  {
    id: 'bzu-fall26-commencement',
    semesterId: 'fall-2026',
    semesterLabel: 'Fall Semester 2026',
    title: 'Semester Commencement',
    audience: 'Morning/Evening',
    eventType: 'commencement',
    startDate: '2026-08-24',
    endDate: '2026-08-24',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
  },
  {
    id: 'bzu-fall26-midterm',
    semesterId: 'fall-2026',
    semesterLabel: 'Fall Semester 2026',
    title: 'Mid-Term Examinations',
    audience: 'Morning/Evening',
    eventType: 'midterm',
    startDate: '2026-10-19',
    endDate: '2026-10-26',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
    notes: 'Inclusive window. Individual paper hours are not specified in the notification.',
  },
  {
    id: 'bzu-fall26-winter-vacations',
    semesterId: 'fall-2026',
    semesterLabel: 'Fall Semester 2026',
    title: 'Winter Vacations',
    audience: 'Morning/Evening',
    eventType: 'vacation',
    startDate: '2026-12-21',
    endDate: '2026-12-31',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
  },
  {
    id: 'bzu-fall26-final',
    semesterId: 'fall-2026',
    semesterLabel: 'Fall Semester 2026',
    title: 'Final Examinations',
    audience: 'Morning/Evening',
    eventType: 'final',
    startDate: '2027-01-01',
    endDate: '2027-01-11',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
    notes: 'Inclusive window. Individual paper hours are not specified in the notification.',
  },
  {
    id: 'bzu-fall26-results',
    semesterId: 'fall-2026',
    semesterLabel: 'Fall Semester 2026',
    title: 'Declaration of Results',
    audience: 'Morning/Evening',
    eventType: 'results',
    startDate: '2027-01-15',
    endDate: '2027-01-15',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
  },

  // SPRING SEMESTER 2027 (Morning/Evening)
  {
    id: 'bzu-spring27-commencement',
    semesterId: 'spring-2027',
    semesterLabel: 'Spring Semester 2027',
    title: 'Semester Commencement',
    audience: 'Morning/Evening',
    eventType: 'commencement',
    startDate: '2027-01-18',
    endDate: '2027-01-18',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
  },
  {
    id: 'bzu-spring27-midterm',
    semesterId: 'spring-2027',
    semesterLabel: 'Spring Semester 2027',
    title: 'Mid-Term Examinations',
    audience: 'Morning/Evening',
    eventType: 'midterm',
    startDate: '2027-03-24',
    endDate: '2027-03-30',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
    notes: 'Inclusive window. Individual paper hours are not specified in the notification.',
  },
  {
    id: 'bzu-spring27-sports',
    semesterId: 'spring-2027',
    semesterLabel: 'Spring Semester 2027',
    title: 'Sports Week',
    audience: 'Morning/Evening',
    eventType: 'sports',
    startDate: '2027-03-31',
    endDate: '2027-04-02',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
  },
  {
    id: 'bzu-spring27-final',
    semesterId: 'spring-2027',
    semesterLabel: 'Spring Semester 2027',
    title: 'Final Examinations',
    audience: 'Morning/Evening',
    eventType: 'final',
    startDate: '2027-06-03',
    endDate: '2027-06-11',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
    notes: 'Inclusive window. Individual paper hours are not specified in the notification.',
  },
  {
    id: 'bzu-spring27-results',
    semesterId: 'spring-2027',
    semesterLabel: 'Spring Semester 2027',
    title: 'Declaration of Results',
    audience: 'Morning/Evening',
    eventType: 'results',
    startDate: '2027-06-16',
    endDate: '2027-06-16',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
  },
  {
    id: 'bzu-spring27-summer-vacations',
    semesterId: 'spring-2027',
    semesterLabel: 'Spring Semester 2027',
    title: 'Summer Vacations',
    audience: 'Morning/Evening',
    eventType: 'vacation',
    startDate: '2027-06-17',
    endDate: '2027-08-30',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
    notes: 'Overlaps with Summer Semester 2027 per official notification; shown verbatim.',
  },

  // SUMMER SEMESTER 2027
  {
    id: 'bzu-summer27-commencement',
    semesterId: 'summer-2027',
    semesterLabel: 'Summer Semester 2027',
    title: 'Semester Commencement',
    audience: 'Summer Semester',
    eventType: 'commencement',
    startDate: '2027-06-21',
    endDate: '2027-06-21',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
    notes: 'Scheduled during Summer Vacations period as listed in official notification.',
  },
  {
    id: 'bzu-summer27-midterm',
    semesterId: 'summer-2027',
    semesterLabel: 'Summer Semester 2027',
    title: 'Mid-Term Examination',
    audience: 'Summer Semester',
    eventType: 'midterm',
    startDate: '2027-07-21',
    endDate: '2027-07-21',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
  },
  {
    id: 'bzu-summer27-final',
    semesterId: 'summer-2027',
    semesterLabel: 'Summer Semester 2027',
    title: 'Final Examinations',
    audience: 'Summer Semester',
    eventType: 'final',
    startDate: '2027-08-23',
    endDate: '2027-08-23',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
  },
  {
    id: 'bzu-summer27-results',
    semesterId: 'summer-2027',
    semesterLabel: 'Summer Semester 2027',
    title: 'Declaration of Results',
    audience: 'Summer Semester',
    eventType: 'results',
    startDate: '2027-08-25',
    endDate: '2027-08-25',
    sourceNotificationNumber: 'Acad/AC-26/7021',
    sourceNotificationDate: '2026-08-18',
    supersedesNotificationNumber: 'Acad/AC-26/5759',
    supersedesNotificationDate: '2026-07-31',
    sourceType: 'user-supplied-notification',
  },
];

export function isDateWithinOfficialWindow(
  karachiDateYmd: string,
  semesterId: AcademicSemesterId,
  examType: 'Midterm' | 'Final Term'
): { valid: boolean; windowLabel: string } {
  const targetEventType = examType === 'Midterm' ? 'midterm' : 'final';
  const match = BZU_ACADEMIC_CALENDAR.find(
    (ev) => ev.semesterId === semesterId && ev.eventType === targetEventType
  );
  if (!match) {
    return { valid: true, windowLabel: 'No official window restriction' };
  }
  const valid = karachiDateYmd >= match.startDate && karachiDateYmd <= match.endDate;
  const windowLabel =
    match.startDate === match.endDate
      ? match.startDate
      : `${match.startDate} to ${match.endDate}`;
  return { valid, windowLabel };
}

export function getCalendarEventStatus(
  event: BzuAcademicCalendarEvent,
  todayKarachiYmd: string
): 'past' | 'current' | 'upcoming' {
  if (todayKarachiYmd < event.startDate) return 'upcoming';
  if (todayKarachiYmd > event.endDate) return 'past';
  return 'current';
}
