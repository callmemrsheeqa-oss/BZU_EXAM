export type UserRole = 'student' | 'teacher' | 'admin';

export type ThemePreference = 'auto' | 'light' | 'dark';

export type ExamType = 'Midterm' | 'Final Term' | 'Quiz' | 'Class Test' | 'Assignment';

export type ExamLifecycleStatus =
  | 'Upcoming'
  | 'Available'
  | 'In Progress'
  | 'Submitted'
  | 'Under Review'
  | 'Result Published';

export type AssignmentStatus =
  | 'Not Started'
  | 'Open'
  | 'Submitted'
  | 'Closed'
  | 'Graded';

export type QuestionType = 'mcq' | 'short' | 'long';

export interface Department {
  id: string;
  code: string;
  name: string;
  faculty: string;
}

export interface Program {
  id: string;
  departmentId: string;
  name: string;
  degreeLevel: 'BS' | 'MS' | 'MPhil';
  durationYears: number;
  totalSemesters: number;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  departmentId: string;
  creditHours: number;
  semesterNumber: number;
  section: string;
  teacherId: string;
  semesterLabel: string; // e.g., "Fall 2026"
}

export interface AcademicCourseRecord {
  courseCode: string;
  courseTitle: string;
  creditHours: number;
  semesterNumber: number;
  grade?: string;
  gradePoints?: number;
  status: 'completed' | 'enrolled' | 'planned';
}

export interface StudentAccount {
  id: string;
  role: 'student';
  name: string;
  email: string;
  password: string; // Deterministic demo password — NOT production security
  avatarInitials: string;
  avatarColor: string;
  studentId: string; // e.g., BZU-STU-0001
  rollNumber: string; // e.g., BS-MATH-24-001
  registrationNumber: string; // e.g., 2024-BZU-0001
  departmentId: string;
  programId: string;
  batch: string; // e.g., "2024-2028"
  admissionYear: number;
  expectedCompletionYear: number;
  semester: number;
  section: string;
  enrolledCourseIds: string[];
  academicHistory: AcademicCourseRecord[];
  cgpa: number;
  active: boolean;
}

export interface TeacherAccount {
  id: string;
  role: 'teacher';
  name: string;
  title: string;
  email: string;
  password: string;
  avatarInitials: string;
  avatarColor: string;
  employeeId: string;
  departmentId: string;
  assignedCourseIds: string[];
  active: boolean;
}

export interface AdminAccount {
  id: string;
  role: 'admin';
  name: string;
  title: string;
  email: string;
  password: string;
  avatarInitials: string;
  avatarColor: string;
  employeeId: string;
  active: boolean;
}

export type AnyUserAccount = StudentAccount | TeacherAccount | AdminAccount;

export interface QuestionItem {
  id: string;
  courseId: string;
  sectionTitle: string;
  type: QuestionType;
  prompt: string;
  instructions?: string;
  points: number;
  order: number;
  options?: string[]; // for MCQ
  correctOptionIndex?: number; // for MCQ (kept hidden from student during active exam)
  sampleRubric?: string;
  tags?: string[];
  createdByTeacherId: string;
}

export interface ExamIntegrityConfig {
  warnOnTabSwitch: boolean;
  strictModeEnabled: boolean;
  strictWarningThreshold: number; // e.g. 3 warnings -> demo finalization
}

export interface Exam {
  id: string;
  title: string;
  courseId: string;
  section: string;
  type: ExamType;
  instructions: string;
  totalMarks: number;
  startAt: string; // ISO timestamp
  endAt: string; // ISO timestamp
  publishAt: string; // ISO timestamp
  isPublishedToStudents: boolean; // Teacher exam availability flag
  isInteractiveSandbox?: boolean; // Rolling live demo exam window
  isDemoExam?: boolean; // Explicitly launched as an interactive demo exam
  durationMinutes?: number; // Configured duration in minutes for demo exams
  isDemoSlotLabel: string; // e.g., "Demo exam slot — not an official BZU date sheet"
  semesterCalendarRef?: 'fall-2026' | 'spring-2027' | 'summer-2027' | 'sandbox';
  questionIds: string[];
  integrity: ExamIntegrityConfig;
  createdByTeacherId: string;
  statusOverride?: 'active' | 'cancelled';
  rescheduleHistory: Array<{
    id: string;
    oldStartAt: string;
    oldEndAt: string;
    newStartAt: string;
    newEndAt: string;
    reason: string;
    changedBy: string;
    changedAt: string;
  }>;
}

export interface Assignment {
  id: string;
  title: string;
  courseId: string;
  section: string;
  instructions: string;
  totalMarks: number;
  openAt: string;
  dueAt: string;
  createdByTeacherId: string;
  isDemoSlotLabel: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt?: string;
  textResponse: string;
  pdfAssetId?: string;
  pdfFileName?: string;
  status: AssignmentStatus;
  marksObtained?: number;
  teacherFeedback?: string;
}

export interface IntegrityIncident {
  id: string;
  examId: string;
  studentId: string;
  timestamp: string;
  type: 'visibility_hidden' | 'window_blur' | 'strict_auto_finalized';
  detail: string;
}

export interface PdfAnnotationStroke {
  id: string;
  pageNumber: number; // 1-indexed
  kind: 'pen' | 'highlight' | 'checkmark' | 'comment';
  color: string;
  points?: Array<{ x: number; y: number }>; // normalized 0..1 coordinates relative to page
  rect?: { x: number; y: number; w: number; h: number }; // normalized 0..1
  text?: string;
  createdAt: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  submittedAt?: string;
  isFinalized: boolean;
  lockedReason?: 'manual_submit' | 'deadline_expired' | 'strict_threshold';
  receiptCode?: string;
  mcqAnswers: Record<string, number>; // questionId -> optionIndex
  flaggedQuestionIds: string[];
  subjectiveTextAnswers: Record<string, string>; // questionId -> typed/dictated answer
  subjectivePdfAssetId?: string; // stored in IndexedDB blobs store
  subjectivePdfFileName?: string;
  subjectivePdfSizeBytes?: number;
  unsubmittedPdfWarning?: boolean;
  lastSavedAt: string;
  mcqAutoScore?: number; // Computed internally, NOT shown to student until result published
  subjectiveQuestionScores: Record<string, number>; // questionId -> marks
  teacherRemarks?: string;
  markingDraftSavedAt?: string;
  initialMarksSaved: boolean;
  initialMarksSavedAt?: string;
  initialMarksSavedBy?: string;
  resultPublished: boolean;
  resultPublishedAt?: string;
  annotations: PdfAnnotationStroke[];
  incidents: IntegrityIncident[];
}

export type RevisionStatus = 'pending' | 'approved' | 'rejected';

export interface MarksRevisionRequest {
  id: string;
  submissionId: string;
  examId: string;
  courseId: string;
  studentId: string;
  teacherId: string;
  oldSubjectiveTotal: number;
  proposedSubjectiveTotal: number;
  proposedQuestionScores: Record<string, number>;
  oldRemarks: string;
  proposedRemarks: string;
  justification: string;
  status: RevisionStatus;
  requestedAt: string;
  reviewedByAdminId?: string;
  decisionNote?: string;
  decidedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole | 'system';
  actorName: string;
  action: string;
  targetType: 'exam' | 'submission' | 'revision' | 'policy' | 'auth' | 'dataset';
  targetId: string;
  summary: string;
}

export interface AppNotification {
  id: string;
  recipientId: string; // user.id or 'all-students' / 'all-teachers'
  roleScope: UserRole | 'all';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  linkTo?: string;
}

export interface SystemPolicyConfig {
  allowStudentCheckedPaperView: boolean; // Global Admin toggle
  perStudentCheckedPaperOverrides: Record<string, boolean>; // studentId -> allow/deny
  gradeScaleLabel: string;
  demoAnchorIso: string; // Anchored once on first seed so interactive demo exam stays live
}

export interface StoredPdfAsset {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64Data: string; // Stored cleanly in IndexedDB
  createdAt: string;
}

export interface UniversityDatabaseState {
  version: number;
  seededAt: string;
  departments: Department[];
  programs: Program[];
  courses: Course[];
  students: StudentAccount[];
  teachers: TeacherAccount[];
  admins: AdminAccount[];
  questions: QuestionItem[];
  exams: Exam[];
  assignments: Assignment[];
  assignmentSubmissions: AssignmentSubmission[];
  submissions: ExamSubmission[];
  revisionRequests: MarksRevisionRequest[];
  auditLogs: AuditLogEntry[];
  notifications: AppNotification[];
  policy: SystemPolicyConfig;
}
