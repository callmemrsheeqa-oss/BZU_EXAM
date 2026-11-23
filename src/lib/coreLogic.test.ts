import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRemainingMs,
  deriveExamLifecycleStatus,
  formatCountdown,
  isExamWindowOpen,
} from './examTimer';
import {
  canStudentAccessExam,
  canStudentViewCheckedPaper,
  canTeacherAccessCourse,
  getTeacherScopedStudents,
} from './permissions';
import {
  computeCgpaFromHistory,
  computeCombinedMarks,
  computeLetterGrade,
  validateSubjectiveScoreMap,
} from './gradeMath';
import {
  canPublishExamResultsNow,
  canPublishSubmissionResult,
  computeDemoExamWindow,
  getTeacherMarkEditMode,
  resolveRevisionDecision,
} from './revisionPolicy';
import {
  BZU_ACADEMIC_CALENDAR,
  isDateWithinOfficialWindow,
} from '../data/bzuAcademicCalendar';
import type {
  Exam,
  ExamSubmission,
  MarksRevisionRequest,
  QuestionItem,
  StudentAccount,
  SystemPolicyConfig,
  TeacherAccount,
} from '../types/domain';

test('strict wall-clock exam countdown never resets on late entry', () => {
  const start = '2026-11-22T10:00:00+05:00';
  const end = '2026-11-22T11:00:00+05:00';
  const lateEntry = Date.parse('2026-11-22T10:15:00+05:00');
  const remaining = computeRemainingMs(end, lateEntry);
  assert.equal(remaining, 45 * 60 * 1000);
  assert.equal(formatCountdown(remaining), '45:00');
  assert.equal(isExamWindowOpen({ startAt: start, endAt: end }, lateEntry), true);
  assert.equal(
    isExamWindowOpen({ startAt: start, endAt: end }, Date.parse('2026-11-22T11:00:00+05:00')),
    false
  );
});

test('exam lifecycle transitions follow real submission and publication state', () => {
  const exam: Exam = {
    id: 'ex-1',
    title: 'Real Analysis Quiz',
    courseId: 'c-1',
    section: 'A',
    type: 'Quiz',
    instructions: 'Read carefully',
    totalMarks: 20,
    startAt: '2026-11-22T10:00:00Z',
    endAt: '2026-11-22T11:00:00Z',
    publishAt: '2026-11-23T10:00:00Z',
    isPublishedToStudents: true,
    isDemoSlotLabel: 'Demo slot',
    questionIds: [],
    integrity: { warnOnTabSwitch: true, strictModeEnabled: false, strictWarningThreshold: 3 },
    createdByTeacherId: 't-1',
    rescheduleHistory: [],
  };

  assert.equal(
    deriveExamLifecycleStatus(exam, undefined, Date.parse('2026-11-22T09:00:00Z')),
    'Upcoming'
  );
  assert.equal(
    deriveExamLifecycleStatus(exam, undefined, Date.parse('2026-11-22T10:10:00Z')),
    'Available'
  );

  const draftSub: ExamSubmission = {
    id: 'sub-1',
    examId: 'ex-1',
    studentId: 's-1',
    startedAt: '2026-11-22T10:05:00Z',
    isFinalized: false,
    mcqAnswers: {},
    flaggedQuestionIds: [],
    subjectiveTextAnswers: {},
    lastSavedAt: '2026-11-22T10:06:00Z',
    subjectiveQuestionScores: {},
    initialMarksSaved: false,
    resultPublished: false,
    annotations: [],
    incidents: [],
  };
  assert.equal(
    deriveExamLifecycleStatus(exam, draftSub, Date.parse('2026-11-22T10:10:00Z')),
    'In Progress'
  );

  const finalizedSub = { ...draftSub, isFinalized: true, submittedAt: '2026-11-22T10:30:00Z' };
  assert.equal(
    deriveExamLifecycleStatus(exam, finalizedSub, Date.parse('2026-11-22T10:35:00Z')),
    'Submitted'
  );

  const gradedSub = { ...finalizedSub, initialMarksSaved: true };
  assert.equal(
    deriveExamLifecycleStatus(exam, gradedSub, Date.parse('2026-11-22T10:40:00Z')),
    'Under Review'
  );

  const publishedSub = { ...gradedSub, resultPublished: true };
  assert.equal(
    deriveExamLifecycleStatus(exam, publishedSub, Date.parse('2026-11-22T10:45:00Z')),
    'Result Published'
  );
});

test('role and course scoping enforces enrollment and checked-paper visibility', () => {
  const student: StudentAccount = {
    id: 'stu-1',
    role: 'student',
    name: 'Ayesha',
    email: 'student001@bzu.edu.pk',
    password: 'p',
    avatarInitials: 'AY',
    avatarColor: '#0b6e4f',
    studentId: 'BZU-STU-0001',
    rollNumber: 'BS-MATH-24-001',
    registrationNumber: '2024-BZU-0001',
    departmentId: 'dept-math',
    programId: 'prog-bs-math',
    batch: '2024-2028',
    admissionYear: 2024,
    expectedCompletionYear: 2028,
    semester: 5,
    section: 'A',
    enrolledCourseIds: ['c-math-301'],
    academicHistory: [],
    cgpa: 3.5,
    active: true,
  };
  const otherStudent = { ...student, id: 'stu-2', enrolledCourseIds: ['c-cs-101'] };
  const teacher: TeacherAccount = {
    id: 't-1',
    role: 'teacher',
    name: 'Dr. Tariq',
    title: 'Associate Professor',
    email: 'teacher001@bzu.edu.pk',
    password: 'p',
    avatarInitials: 'TM',
    avatarColor: '#0b6e4f',
    employeeId: 'EMP-1',
    departmentId: 'dept-math',
    assignedCourseIds: ['c-math-301'],
    active: true,
  };

  const exam = {
    id: 'ex-math',
    title: 'Midterm',
    courseId: 'c-math-301',
    section: 'A',
    type: 'Midterm',
    instructions: '',
    totalMarks: 50,
    startAt: '',
    endAt: '',
    publishAt: '',
    isPublishedToStudents: true,
    isDemoSlotLabel: 'Demo',
    questionIds: [],
    integrity: { warnOnTabSwitch: true, strictModeEnabled: false, strictWarningThreshold: 3 },
    createdByTeacherId: 't-1',
    rescheduleHistory: [],
  } as Exam;

  assert.equal(canStudentAccessExam(student, exam), true);
  assert.equal(canStudentAccessExam(otherStudent, exam), false);
  assert.equal(canTeacherAccessCourse(teacher, 'c-math-301'), true);
  assert.equal(canTeacherAccessCourse(teacher, 'c-cs-101'), false);
  assert.deepEqual(
    getTeacherScopedStudents(teacher, [student, otherStudent]).map((s) => s.id),
    ['stu-1']
  );

  const sub = { id: 'sub-1', resultPublished: true } as ExamSubmission;
  const policyDeny: SystemPolicyConfig = {
    allowStudentCheckedPaperView: false,
    perStudentCheckedPaperOverrides: {},
    gradeScaleLabel: 'BZU Demo Scale',
    demoAnchorIso: '2026-11-22T00:00:00Z',
  };
  assert.equal(canStudentViewCheckedPaper('stu-1', sub, policyDeny), false);
  const policyOverrideAllow: SystemPolicyConfig = {
    ...policyDeny,
    perStudentCheckedPaperOverrides: { 'stu-1': true },
  };
  assert.equal(canStudentViewCheckedPaper('stu-1', sub, policyOverrideAllow), true);
});

test('grade math computes MCQ auto-score, validates subjective bounds, and computes CGPA', () => {
  const questions: QuestionItem[] = [
    {
      id: 'q1',
      courseId: 'c1',
      sectionTitle: 'A',
      type: 'mcq',
      prompt: '2+2?',
      points: 5,
      order: 1,
      options: ['3', '4', '5'],
      correctOptionIndex: 1,
      createdByTeacherId: 't1',
    },
    {
      id: 'q2',
      courseId: 'c1',
      sectionTitle: 'B',
      type: 'long',
      prompt: 'Prove theorem',
      points: 15,
      order: 2,
      createdByTeacherId: 't1',
    },
  ];
  const submission: ExamSubmission = {
    id: 'sub1',
    examId: 'ex1',
    studentId: 's1',
    startedAt: '2026-11-22T10:00:00Z',
    isFinalized: true,
    mcqAnswers: { q1: 1 },
    flaggedQuestionIds: [],
    subjectiveTextAnswers: {},
    lastSavedAt: '2026-11-22T10:20:00Z',
    subjectiveQuestionScores: { q2: 12 },
    initialMarksSaved: true,
    resultPublished: false,
    annotations: [],
    incidents: [],
  };

  const combined = computeCombinedMarks(submission, questions);
  assert.equal(combined.mcq, 5);
  assert.equal(combined.subjective, 12);
  assert.equal(combined.totalObtained, 17);
  assert.equal(combined.totalMax, 20);
  assert.equal(computeLetterGrade(17, 20).letter, 'A');
  assert.equal(validateSubjectiveScoreMap({ q2: 16 }, questions).valid, false);
  assert.equal(validateSubjectiveScoreMap({ q2: 14 }, questions).valid, true);

  const cgpa = computeCgpaFromHistory([
    { courseCode: 'M1', courseTitle: 'Calc', creditHours: 3, semesterNumber: 1, grade: 'A', gradePoints: 4.0, status: 'completed' },
    { courseCode: 'M2', courseTitle: 'Alg', creditHours: 3, semesterNumber: 1, grade: 'B', gradePoints: 3.0, status: 'completed' },
    { courseCode: 'M3', courseTitle: 'Current', creditHours: 3, semesterNumber: 2, status: 'enrolled' },
  ]);
  assert.equal(cgpa, 3.5);
});

test('marks revision policy enforces pre-pub approval, publication hold, and post-pub lock', () => {
  const baseSub: ExamSubmission = {
    id: 'sub-rev',
    examId: 'ex-1',
    studentId: 'stu-1',
    startedAt: '2026-11-22T10:00:00Z',
    isFinalized: true,
    mcqAnswers: {},
    flaggedQuestionIds: [],
    subjectiveTextAnswers: {},
    lastSavedAt: '2026-11-22T10:20:00Z',
    subjectiveQuestionScores: { q2: 10 },
    teacherRemarks: 'Initial check',
    initialMarksSaved: false,
    resultPublished: false,
    annotations: [],
    incidents: [],
  };

  assert.equal(getTeacherMarkEditMode(baseSub), 'initial_save');
  const savedSub = { ...baseSub, initialMarksSaved: true };
  assert.equal(getTeacherMarkEditMode(savedSub), 'requires_admin_revision');

  const pendingReq: MarksRevisionRequest = {
    id: 'rev-1',
    submissionId: 'sub-rev',
    examId: 'ex-1',
    courseId: 'c-1',
    studentId: 'stu-1',
    teacherId: 't-1',
    oldSubjectiveTotal: 10,
    proposedSubjectiveTotal: 13,
    proposedQuestionScores: { q2: 13 },
    oldRemarks: 'Initial check',
    proposedRemarks: 'Recounted step 2',
    justification: 'Student step 2 partial credit missed',
    status: 'pending',
    requestedAt: '2026-11-22T12:00:00Z',
  };

  // Publication MUST be held while revision is pending
  assert.equal(canPublishSubmissionResult(savedSub, [pendingReq]).allowed, false);

  // Rejecting retains old marks and unlocks publication
  const rejected = resolveRevisionDecision(
    savedSub,
    pendingReq,
    'rejected',
    'admin-1',
    'Step 2 was incomplete',
    '2026-11-22T13:00:00Z'
  );
  assert.equal(rejected.updatedSubmission.subjectiveQuestionScores.q2, 10);
  assert.equal(canPublishSubmissionResult(rejected.updatedSubmission, [rejected.updatedRevision]).allowed, true);

  // Approving applies new marks and unlocks publication
  const approved = resolveRevisionDecision(
    savedSub,
    pendingReq,
    'approved',
    'admin-1',
    'Verified partial credit',
    '2026-11-22T13:00:00Z'
  );
  assert.equal(approved.updatedSubmission.subjectiveQuestionScores.q2, 13);
  assert.equal(canPublishSubmissionResult(approved.updatedSubmission, [approved.updatedRevision]).allowed, true);

  // Published result is locked
  const publishedSub = { ...approved.updatedSubmission, resultPublished: true };
  assert.equal(getTeacherMarkEditMode(publishedSub), 'locked_published');
});

test('official BZU academic calendar preserves exact windows and overlapping Summer dates', () => {
  const summerVac = BZU_ACADEMIC_CALENDAR.find((e) => e.id === 'bzu-spring27-summer-vacations');
  const summerStart = BZU_ACADEMIC_CALENDAR.find((e) => e.id === 'bzu-summer27-commencement');
  assert.equal(summerVac?.startDate, '2027-06-17');
  assert.equal(summerVac?.endDate, '2027-08-30');
  assert.equal(summerStart?.startDate, '2027-06-21');
  assert.equal(isDateWithinOfficialWindow('2026-10-21', 'fall-2026', 'Midterm').valid, true);
  assert.equal(isDateWithinOfficialWindow('2026-11-05', 'fall-2026', 'Midterm').valid, false);
});

test('demo exam window and exam-level instant result publish gate', () => {
  const now = Date.parse('2026-11-23T10:00:00Z');
  const win = computeDemoExamWindow(now, 45);
  assert.equal(win.durationMinutes, 45);
  assert.equal(Date.parse(win.endAt) - Date.parse(win.startAt), 45 * 60 * 1000);

  const sub1: ExamSubmission = {
    id: 's1',
    examId: 'ex-demo',
    studentId: 'stu-1',
    startedAt: '2026-11-23T10:00:00Z',
    isFinalized: true,
    mcqAnswers: {},
    flaggedQuestionIds: [],
    subjectiveTextAnswers: {},
    lastSavedAt: '2026-11-23T10:15:00Z',
    subjectiveQuestionScores: { q2: 8 },
    initialMarksSaved: false,
    resultPublished: false,
    annotations: [],
    incidents: [],
  };

  // Ungraded submission blocks exam-level publication
  const gateUngraded = canPublishExamResultsNow('ex-demo', [sub1], []);
  assert.equal(gateUngraded.allowed, false);
  assert.equal(gateUngraded.ungradedCount, 1);

  // Graded submission with pending revision blocks publication
  const sub1Graded = { ...sub1, initialMarksSaved: true };
  const pendingRev: MarksRevisionRequest = {
    id: 'rev-demo',
    submissionId: 's1',
    examId: 'ex-demo',
    courseId: 'c1',
    studentId: 'stu-1',
    teacherId: 't1',
    oldSubjectiveTotal: 8,
    proposedSubjectiveTotal: 10,
    proposedQuestionScores: { q2: 10 },
    oldRemarks: '',
    proposedRemarks: 'Updated',
    justification: 'Recheck',
    status: 'pending',
    requestedAt: '2026-11-23T10:20:00Z',
  };
  const gatePending = canPublishExamResultsNow('ex-demo', [sub1Graded], [pendingRev]);
  assert.equal(gatePending.allowed, false);
  assert.equal(gatePending.pendingRevisionCount, 1);

  // Approved revision unblocks Publish Demo Results Now
  const approvedRev: MarksRevisionRequest = { ...pendingRev, status: 'approved' };
  const gateReady = canPublishExamResultsNow('ex-demo', [sub1Graded], [approvedRev]);
  assert.equal(gateReady.allowed, true);
  assert.equal(gateReady.unpublishedCount, 1);
});

