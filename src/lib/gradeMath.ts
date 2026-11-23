import type { AcademicCourseRecord, ExamSubmission, QuestionItem } from '../types/domain';

export interface GradeScaleEntry {
  minPercent: number;
  letter: string;
  gpa: number;
}

export const DEMO_BZU_GRADE_SCALE: GradeScaleEntry[] = [
  { minPercent: 85, letter: 'A', gpa: 4.0 },
  { minPercent: 80, letter: 'A-', gpa: 3.7 },
  { minPercent: 75, letter: 'B+', gpa: 3.3 },
  { minPercent: 70, letter: 'B', gpa: 3.0 },
  { minPercent: 65, letter: 'B-', gpa: 2.7 },
  { minPercent: 61, letter: 'C+', gpa: 2.3 },
  { minPercent: 58, letter: 'C', gpa: 2.0 },
  { minPercent: 55, letter: 'C-', gpa: 1.7 },
  { minPercent: 50, letter: 'D', gpa: 1.0 },
  { minPercent: 0, letter: 'F', gpa: 0.0 },
];

export function computeLetterGrade(
  obtained: number,
  total: number
): { percentage: number; letter: string; gpa: number } {
  if (total <= 0) return { percentage: 0, letter: 'N/A', gpa: 0 };
  const percentage = Math.round(((obtained / total) * 100) * 100) / 100;
  const entry =
    DEMO_BZU_GRADE_SCALE.find((item) => percentage >= item.minPercent) ??
    DEMO_BZU_GRADE_SCALE[DEMO_BZU_GRADE_SCALE.length - 1];
  return { percentage, letter: entry.letter, gpa: entry.gpa };
}

export function computeMcqAutoScore(
  mcqAnswers: Record<string, number>,
  questions: QuestionItem[]
): number {
  let score = 0;
  for (const q of questions) {
    if (q.type !== 'mcq') continue;
    const chosen = mcqAnswers[q.id];
    if (typeof chosen === 'number' && chosen === q.correctOptionIndex) {
      score += q.points;
    }
  }
  return score;
}

export function computeSubjectiveTotal(
  subjectiveQuestionScores: Record<string, number>,
  questions: QuestionItem[]
): number {
  let total = 0;
  for (const q of questions) {
    if (q.type === 'mcq') continue;
    const val = subjectiveQuestionScores[q.id];
    if (typeof val === 'number' && !Number.isNaN(val)) {
      total += val;
    }
  }
  return total;
}

export function computeCombinedMarks(
  submission: ExamSubmission,
  questions: QuestionItem[]
): { mcq: number; subjective: number; totalObtained: number; totalMax: number } {
  const mcq =
    typeof submission.mcqAutoScore === 'number'
      ? submission.mcqAutoScore
      : computeMcqAutoScore(submission.mcqAnswers, questions);
  const subjective = computeSubjectiveTotal(submission.subjectiveQuestionScores, questions);
  const totalMax = questions.reduce((acc, q) => acc + q.points, 0);
  return {
    mcq,
    subjective,
    totalObtained: mcq + subjective,
    totalMax,
  };
}

export function validateSubjectiveScoreMap(
  scores: Record<string, number>,
  questions: QuestionItem[]
): { valid: boolean; error?: string } {
  for (const q of questions) {
    if (q.type === 'mcq') continue;
    const val = scores[q.id];
    if (val === undefined) continue;
    if (Number.isNaN(val) || val < 0) {
      return { valid: false, error: `Marks for question "${q.prompt.slice(0, 30)}..." cannot be negative.` };
    }
    if (val > q.points) {
      return {
        valid: false,
        error: `Marks (${val}) exceed maximum available points (${q.points}) for question #${q.order}.`,
      };
    }
  }
  return { valid: true };
}

export function computeCgpaFromHistory(records: AcademicCourseRecord[]): number {
  let totalCredits = 0;
  let totalWeightedPoints = 0;
  for (const rec of records) {
    if (rec.status === 'completed' && typeof rec.gradePoints === 'number' && rec.creditHours > 0) {
      totalCredits += rec.creditHours;
      totalWeightedPoints += rec.gradePoints * rec.creditHours;
    }
  }
  if (totalCredits === 0) return 0;
  return Math.round((totalWeightedPoints / totalCredits) * 100) / 100;
}
