import type { ExamSubmission, MarksRevisionRequest } from '../types/domain';

export function hasPendingRevisionForSubmission(
  submissionId: string,
  revisions: MarksRevisionRequest[]
): boolean {
  return revisions.some((r) => r.submissionId === submissionId && r.status === 'pending');
}

export function hasPendingRevisionForExam(
  examId: string,
  submissions: ExamSubmission[],
  revisions: MarksRevisionRequest[]
): boolean {
  const examSubIds = new Set(
    submissions.filter((s) => s.examId === examId).map((s) => s.id)
  );
  return revisions.some((r) => r.status === 'pending' && examSubIds.has(r.submissionId));
}

export type TeacherMarkActionMode =
  | 'initial_save'
  | 'requires_admin_revision'
  | 'locked_published';

export function getTeacherMarkEditMode(submission: ExamSubmission): TeacherMarkActionMode {
  if (submission.resultPublished) {
    return 'locked_published';
  }
  if (submission.initialMarksSaved) {
    return 'requires_admin_revision';
  }
  return 'initial_save';
}

export function canPublishSubmissionResult(
  submission: ExamSubmission,
  revisions: MarksRevisionRequest[]
): { allowed: boolean; reason?: string } {
  if (!submission.isFinalized) {
    return { allowed: false, reason: 'Student attempt is not finalized yet.' };
  }
  if (hasPendingRevisionForSubmission(submission.id, revisions)) {
    return {
      allowed: false,
      reason: 'Held: A marks revision request is pending Admin approval.',
    };
  }
  return { allowed: true };
}

export function resolveRevisionDecision(
  submission: ExamSubmission,
  revision: MarksRevisionRequest,
  decision: 'approved' | 'rejected',
  adminId: string,
  decisionNote: string,
  decidedAtIso: string
): { updatedSubmission: ExamSubmission; updatedRevision: MarksRevisionRequest } {
  const updatedRevision: MarksRevisionRequest = {
    ...revision,
    status: decision,
    reviewedByAdminId: adminId,
    decisionNote: decisionNote.trim() || (decision === 'approved' ? 'Approved by Admin.' : 'Rejected by Admin.'),
    decidedAt: decidedAtIso,
  };

  if (decision === 'approved') {
    return {
      updatedRevision,
      updatedSubmission: {
        ...submission,
        subjectiveQuestionScores: { ...revision.proposedQuestionScores },
        teacherRemarks: revision.proposedRemarks,
      },
    };
  }

  // Rejected: retain original saved marks untouched
  return {
    updatedRevision,
    updatedSubmission: submission,
  };
}

export function computeDemoExamWindow(
  nowMs: number,
  durationMinutes: number
): { startAt: string; endAt: string; durationMinutes: number } {
  const safeMinutes = Math.max(1, Math.min(480, Math.round(durationMinutes || 30)));
  return {
    startAt: new Date(nowMs).toISOString(),
    endAt: new Date(nowMs + safeMinutes * 60 * 1000).toISOString(),
    durationMinutes: safeMinutes,
  };
}

export interface ExamPublishGateStatus {
  allowed: boolean;
  reason?: string;
  finalizedCount: number;
  unpublishedCount: number;
  ungradedCount: number;
  pendingRevisionCount: number;
}

export function canPublishExamResultsNow(
  examId: string,
  submissions: ExamSubmission[],
  revisions: MarksRevisionRequest[]
): ExamPublishGateStatus {
  const finalized = submissions.filter((s) => s.examId === examId && s.isFinalized);
  const finalizedCount = finalized.length;
  const ungradedCount = finalized.filter((s) => !s.initialMarksSaved).length;
  const unpublishedCount = finalized.filter((s) => !s.resultPublished).length;
  const finalizedIds = new Set(finalized.map((s) => s.id));
  const pendingRevisionCount = revisions.filter(
    (r) => r.status === 'pending' && (r.examId === examId || finalizedIds.has(r.submissionId))
  ).length;

  if (finalizedCount === 0) {
    return {
      allowed: false,
      reason: 'No finalized student submissions exist for this exam yet.',
      finalizedCount,
      unpublishedCount,
      ungradedCount,
      pendingRevisionCount,
    };
  }
  if (ungradedCount > 0) {
    return {
      allowed: false,
      reason: `${ungradedCount} submitted paper(s) still require finalized initial marking.`,
      finalizedCount,
      unpublishedCount,
      ungradedCount,
      pendingRevisionCount,
    };
  }
  if (pendingRevisionCount > 0) {
    return {
      allowed: false,
      reason: `${pendingRevisionCount} marks revision request(s) are pending Admin approval.`,
      finalizedCount,
      unpublishedCount,
      ungradedCount,
      pendingRevisionCount,
    };
  }
  if (unpublishedCount === 0) {
    return {
      allowed: false,
      reason: 'All finalized results for this exam are already published.',
      finalizedCount,
      unpublishedCount,
      ungradedCount,
      pendingRevisionCount,
    };
  }
  return {
    allowed: true,
    finalizedCount,
    unpublishedCount,
    ungradedCount,
    pendingRevisionCount,
  };
}

