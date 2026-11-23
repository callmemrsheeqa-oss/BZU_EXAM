import type {
  Assignment,
  AssignmentStatus,
  AssignmentSubmission,
  Exam,
  ExamLifecycleStatus,
  ExamSubmission,
} from '../types/domain';

/**
 * Formats an ISO timestamp in Asia/Karachi timezone (PKT, UTC+5).
 */
export function formatKarachiDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatKarachiDateOnly(ymdOrIso: string): string {
  const date = ymdOrIso.length === 10 ? new Date(`${ymdOrIso}T12:00:00+05:00`) : new Date(ymdOrIso);
  if (Number.isNaN(date.getTime())) return ymdOrIso;
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export function getTodayKarachiYmd(nowMs: number = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(nowMs));
  const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

export function getKarachiYmdFromIso(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  return getTodayKarachiYmd(ms);
}

/**
 * Strict wall-clock exam timing: remaining milliseconds depend ONLY on
 * exam.endAt - nowMs, NEVER resetting on login, late entry, or page refresh.
 */
export function computeRemainingMs(examEndAtIso: string, nowMs: number = Date.now()): number {
  const endMs = Date.parse(examEndAtIso);
  if (Number.isNaN(endMs)) return 0;
  return Math.max(0, endMs - nowMs);
}

export function isExamWindowOpen(exam: Pick<Exam, 'startAt' | 'endAt' | 'statusOverride'>, nowMs: number = Date.now()): boolean {
  if (exam.statusOverride === 'cancelled') return false;
  const startMs = Date.parse(exam.startAt);
  const endMs = Date.parse(exam.endAt);
  return nowMs >= startMs && nowMs < endMs;
}

export function isExamExpired(exam: Pick<Exam, 'endAt'>, nowMs: number = Date.now()): boolean {
  const endMs = Date.parse(exam.endAt);
  return nowMs >= endMs;
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Derives realistic exam lifecycle status without faking impossible transitions.
 */
export function deriveExamLifecycleStatus(
  exam: Exam,
  submission: ExamSubmission | undefined,
  nowMs: number = Date.now()
): ExamLifecycleStatus {
  if (submission?.resultPublished) {
    return 'Result Published';
  }
  if (submission?.isFinalized) {
    return submission.initialMarksSaved ? 'Under Review' : 'Submitted';
  }
  const startMs = Date.parse(exam.startAt);
  const endMs = Date.parse(exam.endAt);

  if (nowMs < startMs) {
    return 'Upcoming';
  }
  if (nowMs >= startMs && nowMs < endMs) {
    return submission ? 'In Progress' : 'Available';
  }
  // Window ended and student either never submitted or had unfinalized draft
  if (submission) {
    return 'Submitted';
  }
  return 'Under Review';
}

export function deriveAssignmentStatus(
  assignment: Assignment,
  sub: AssignmentSubmission | undefined,
  nowMs: number = Date.now()
): AssignmentStatus {
  if (typeof sub?.marksObtained === 'number') return 'Graded';
  if (sub?.submittedAt) return 'Submitted';
  const openMs = Date.parse(assignment.openAt);
  const dueMs = Date.parse(assignment.dueAt);
  if (nowMs < openMs) return 'Not Started';
  if (nowMs > dueMs) return 'Closed';
  return 'Open';
}
