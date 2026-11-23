import type {
  AnyUserAccount,
  Course,
  Exam,
  ExamSubmission,
  StudentAccount,
  SystemPolicyConfig,
  TeacherAccount,
  UserRole,
} from '../types/domain';

/**
 * Centralized client-side role & access policy for prototype demonstration.
 * NOTE: Client-side checks are NOT real security; production requires backend enforcement.
 */

export function canAccessRoleRoute(user: AnyUserAccount | null, requiredRole: UserRole): boolean {
  if (!user || !user.active) return false;
  return user.role === requiredRole;
}

export function canStudentAccessExam(student: StudentAccount, exam: Exam): boolean {
  if (!student.active || !exam.isPublishedToStudents) return false;
  return student.enrolledCourseIds.includes(exam.courseId);
}

export function canTeacherAccessCourse(teacher: TeacherAccount, courseId: string): boolean {
  if (!teacher.active) return false;
  return teacher.assignedCourseIds.includes(courseId);
}

export function getTeacherScopedStudents(
  teacher: TeacherAccount,
  allStudents: StudentAccount[]
): StudentAccount[] {
  const assignedSet = new Set(teacher.assignedCourseIds);
  return allStudents.filter((student) =>
    student.enrolledCourseIds.some((cid) => assignedSet.has(cid))
  );
}

export function getTeacherScopedCourses(
  teacher: TeacherAccount,
  allCourses: Course[]
): Course[] {
  const assignedSet = new Set(teacher.assignedCourseIds);
  return allCourses.filter((c) => assignedSet.has(c.id));
}

export function canStudentViewCheckedPaper(
  studentId: string,
  submission: ExamSubmission,
  policy: SystemPolicyConfig
): boolean {
  if (!submission.resultPublished) return false;
  if (studentId in policy.perStudentCheckedPaperOverrides) {
    return Boolean(policy.perStudentCheckedPaperOverrides[studentId]);
  }
  return policy.allowStudentCheckedPaperView;
}
