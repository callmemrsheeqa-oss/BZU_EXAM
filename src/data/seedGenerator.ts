import type {
  AcademicCourseRecord,
  AdminAccount,
  AppNotification,
  Assignment,
  AssignmentSubmission,
  AuditLogEntry,
  Course,
  Department,
  Exam,
  ExamSubmission,
  MarksRevisionRequest,
  Program,
  QuestionItem,
  StoredPdfAsset,
  StudentAccount,
  TeacherAccount,
  UniversityDatabaseState,
} from '../types/domain';
import { computeCgpaFromHistory, computeMcqAutoScore } from '../lib/gradeMath';
import { generateSampleAnswerPdfBase64 } from '../lib/pdfUtils';

// Deterministic PRNG (Mulberry32) so 500/25/1 records are 100% reproducible
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicPassword(prefix: string, index: number): string {
  // Deterministic non-secret demo credentials for presentation & QA
  const code = ((index * 7919 + 104729) % 9000) + 1000;
  return `BzuDemo#${prefix}${code}`;
}

const FIRST_NAMES_MALE = [
  'Muhammad', 'Ahmed', 'Bilal', 'Usman', 'Hamza', 'Hassan', 'Zain', 'Saad',
  'Umar', 'Faisal', 'Talha', 'Daniyal', 'Salman', 'Kamran', 'Tariq', 'Imran',
  'Adnan', 'Rizwan', 'Waqas', 'Farhan', 'Shoaib', 'Asad', 'Arsalan', 'Yasir',
];

const FIRST_NAMES_FEMALE = [
  'Ayesha', 'Fatima', 'Zainab', 'Hira', 'Maryam', 'Sana', 'Amna', 'Nadia',
  'Iqra', 'Khadija', 'Maham', 'Rabia', 'Anum', 'Nimra', 'Mahnoor', 'Sadia',
  'Bushra', 'Amina', 'Laiba', 'Zoya', 'Kinza', 'Aleena', 'Sidra', 'Mehwish',
];

const LAST_NAMES = [
  'Gillani', 'Qureshi', 'Bukhari', 'Khakwani', 'Gardezi', 'Leghari', 'Mazari',
  'Khan', 'Malik', 'Bhatti', 'Chaudhry', 'Raza', 'Siddiqui', 'Hashmi', 'Abbasi',
  'Mahmood', 'Javed', 'Akhtar', 'Nawaz', 'Sheikh', 'Cheema', 'Randhawa', 'Tahir',
];

const AVATAR_PALETTE = [
  '#0B6E4F', '#0F766E', '#1D4ED8', '#B45309', '#4338CA', '#047857', '#0369A1', '#7C2D12',
];

export const DEPARTMENTS: Department[] = [
  { id: 'dept-caspam', code: 'CASPAM', name: 'Centre for Advanced Studies in Pure & Applied Mathematics', faculty: 'Faculty of Science' },
  { id: 'dept-cs', code: 'CS', name: 'Department of Computer Science', faculty: 'Faculty of Science' },
  { id: 'dept-se', code: 'SE', name: 'Department of Software Engineering', faculty: 'Faculty of Engineering & Technology' },
  { id: 'dept-phys', code: 'PHYS', name: 'Department of Physics', faculty: 'Faculty of Science' },
  { id: 'dept-econ', code: 'ECON', name: 'School of Economics', faculty: 'Faculty of Arts & Social Sciences' },
  { id: 'dept-eng', code: 'ENG', name: 'Department of English', faculty: 'Faculty of Arts & Social Sciences' },
];

export const PROGRAMS: Program[] = [
  { id: 'prog-bs-math', departmentId: 'dept-caspam', name: 'BS Mathematics', degreeLevel: 'BS', durationYears: 4, totalSemesters: 8 },
  { id: 'prog-ms-math', departmentId: 'dept-caspam', name: 'MPhil Applied Mathematics', degreeLevel: 'MPhil', durationYears: 2, totalSemesters: 4 },
  { id: 'prog-bs-cs', departmentId: 'dept-cs', name: 'BS Computer Science', degreeLevel: 'BS', durationYears: 4, totalSemesters: 8 },
  { id: 'prog-bs-se', departmentId: 'dept-se', name: 'BS Software Engineering', degreeLevel: 'BS', durationYears: 4, totalSemesters: 8 },
  { id: 'prog-bs-phys', departmentId: 'dept-phys', name: 'BS Physics', degreeLevel: 'BS', durationYears: 4, totalSemesters: 8 },
  { id: 'prog-bs-econ', departmentId: 'dept-econ', name: 'BS Economics', degreeLevel: 'BS', durationYears: 4, totalSemesters: 8 },
  { id: 'prog-bs-eng', departmentId: 'dept-eng', name: 'BS English Literature', degreeLevel: 'BS', durationYears: 4, totalSemesters: 8 },
];

export function generateSeedDataset(anchorNowIso?: string): {
  db: UniversityDatabaseState;
  pdfAssets: StoredPdfAsset[];
} {
  const rng = createRng(20260818);
  const nowIso = anchorNowIso ?? new Date().toISOString();
  const nowMs = Date.parse(nowIso);

  // 1. Seed 25 Teachers (teacher001@bzu.edu.pk ... teacher025@bzu.edu.pk)
  const teacherTitles = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'];
  const teachers: TeacherAccount[] = [];
  for (let i = 1; i <= 25; i++) {
    const padded = String(i).padStart(3, '0');
    const isFemale = i % 3 === 0;
    const first = isFemale
      ? FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length]
      : FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length];
    const last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const dept = DEPARTMENTS[(i - 1) % DEPARTMENTS.length];
    const prefix = i <= 15 ? 'Dr.' : '';
    const fullName = i === 1 ? 'Dr. Tariq Mahmood Qureshi' : `${prefix ? `${prefix} ` : ''}${first} ${last}`;
    const initials = fullName
      .replace(/^Dr\.\s*/, '')
      .split(' ')
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase();

    teachers.push({
      id: `teacher-${padded}`,
      role: 'teacher',
      name: fullName,
      title: i === 1 ? 'Associate Professor' : teacherTitles[i % teacherTitles.length],
      email: `teacher${padded}@bzu.edu.pk`,
      password: i === 1 ? 'BzuDemo#Teach001' : deterministicPassword('T', i),
      avatarInitials: initials,
      avatarColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
      employeeId: `BZU-FAC-${padded}`,
      departmentId: i === 1 ? 'dept-caspam' : dept.id,
      assignedCourseIds: [],
      active: true,
    });
  }

  // 2. Seed Courses across departments (24 courses total)
  const courseBlueprints: Array<{
    id: string;
    code: string;
    title: string;
    departmentId: string;
    creditHours: number;
    semesterNumber: number;
    section: string;
    teacherIndex: number;
  }> = [
    // CASPAM / Mathematics (Teacher 1 assigned to first 3)
    { id: 'crs-math-301', code: 'MATH-301', title: 'Real Analysis I', departmentId: 'dept-caspam', creditHours: 3, semesterNumber: 5, section: 'A', teacherIndex: 0 },
    { id: 'crs-math-303', code: 'MATH-303', title: 'Ordinary Differential Equations', departmentId: 'dept-caspam', creditHours: 3, semesterNumber: 5, section: 'A', teacherIndex: 0 },
    { id: 'crs-math-305', code: 'MATH-305', title: 'Numerical Computing & Methods', departmentId: 'dept-caspam', creditHours: 3, semesterNumber: 5, section: 'B', teacherIndex: 0 },
    { id: 'crs-math-401', code: 'MATH-401', title: 'Functional Analysis', departmentId: 'dept-caspam', creditHours: 3, semesterNumber: 7, section: 'A', teacherIndex: 6 },
    { id: 'crs-math-405', code: 'MATH-405', title: 'Partial Differential Equations', departmentId: 'dept-caspam', creditHours: 3, semesterNumber: 7, section: 'A', teacherIndex: 12 },
    // CS
    { id: 'crs-cs-301', code: 'CS-301', title: 'Design & Analysis of Algorithms', departmentId: 'dept-cs', creditHours: 3, semesterNumber: 5, section: 'A', teacherIndex: 1 },
    { id: 'crs-cs-303', code: 'CS-303', title: 'Database Management Systems', departmentId: 'dept-cs', creditHours: 4, semesterNumber: 5, section: 'A', teacherIndex: 7 },
    { id: 'crs-cs-305', code: 'CS-305', title: 'Operating Systems', departmentId: 'dept-cs', creditHours: 3, semesterNumber: 5, section: 'B', teacherIndex: 13 },
    { id: 'crs-cs-401', code: 'CS-401', title: 'Compiler Construction', departmentId: 'dept-cs', creditHours: 3, semesterNumber: 7, section: 'A', teacherIndex: 19 },
    // SE
    { id: 'crs-se-301', code: 'SE-301', title: 'Software Requirement Engineering', departmentId: 'dept-se', creditHours: 3, semesterNumber: 5, section: 'A', teacherIndex: 2 },
    { id: 'crs-se-303', code: 'SE-303', title: 'Software Quality Assurance', departmentId: 'dept-se', creditHours: 3, semesterNumber: 5, section: 'A', teacherIndex: 8 },
    { id: 'crs-se-305', code: 'SE-305', title: 'Web Engineering & Architecture', departmentId: 'dept-se', creditHours: 3, semesterNumber: 5, section: 'B', teacherIndex: 14 },
    // Physics
    { id: 'crs-phys-301', code: 'PHYS-301', title: 'Quantum Mechanics I', departmentId: 'dept-phys', creditHours: 3, semesterNumber: 5, section: 'A', teacherIndex: 3 },
    { id: 'crs-phys-303', code: 'PHYS-303', title: 'Electrodynamics II', departmentId: 'dept-phys', creditHours: 3, semesterNumber: 5, section: 'A', teacherIndex: 9 },
    { id: 'crs-phys-305', code: 'PHYS-305', title: 'Statistical Mechanics', departmentId: 'dept-phys', creditHours: 3, semesterNumber: 5, section: 'B', teacherIndex: 15 },
    // Economics
    { id: 'crs-econ-301', code: 'ECON-301', title: 'Econometrics I', departmentId: 'dept-econ', creditHours: 3, semesterNumber: 5, section: 'A', teacherIndex: 4 },
    { id: 'crs-econ-303', code: 'ECON-303', title: 'Macroeconomic Theory', departmentId: 'dept-econ', creditHours: 3, semesterNumber: 5, section: 'A', teacherIndex: 10 },
    { id: 'crs-econ-305', code: 'ECON-305', title: 'Development Economics', departmentId: 'dept-econ', creditHours: 3, semesterNumber: 5, section: 'B', teacherIndex: 16 },
    // English
    { id: 'crs-eng-301', code: 'ENG-301', title: 'Literary Criticism & Theory', departmentId: 'dept-eng', creditHours: 3, semesterNumber: 5, section: 'A', teacherIndex: 5 },
    { id: 'crs-eng-303', code: 'ENG-303', title: 'Modernist Fiction', departmentId: 'dept-eng', creditHours: 3, semesterNumber: 5, section: 'A', teacherIndex: 11 },
    { id: 'crs-eng-305', code: 'ENG-305', title: 'Sociolinguistics', departmentId: 'dept-eng', creditHours: 3, semesterNumber: 5, section: 'B', teacherIndex: 17 },
  ];

  const courses: Course[] = courseBlueprints.map((bp, idx) => {
    const assignedTeacher = teachers[bp.teacherIndex % teachers.length];
    assignedTeacher.assignedCourseIds.push(bp.id);
    // Assign remaining teachers so every teacher has at least 1 course
    return {
      id: bp.id,
      code: bp.code,
      title: bp.title,
      departmentId: bp.departmentId,
      creditHours: bp.creditHours,
      semesterNumber: bp.semesterNumber,
      section: bp.section,
      teacherId: assignedTeacher.id,
      semesterLabel: idx % 2 === 0 ? 'Fall 2026' : 'Fall 2026',
    };
  });

  // Ensure teachers 18..25 also have assigned courses
  for (let i = 0; i < teachers.length; i++) {
    if (teachers[i].assignedCourseIds.length === 0) {
      const fallbackCourse = courses[i % courses.length];
      teachers[i].assignedCourseIds.push(fallbackCourse.id);
    }
  }

  // 3. Seed 500 Students (student001@bzu.edu.pk ... student500@bzu.edu.pk)
  const gradeEntries = [
    { grade: 'A', pts: 4.0 },
    { grade: 'A-', pts: 3.7 },
    { grade: 'B+', pts: 3.3 },
    { grade: 'B', pts: 3.0 },
    { grade: 'B-', pts: 2.7 },
    { grade: 'C+', pts: 2.3 },
  ];

  const students: StudentAccount[] = [];
  for (let i = 1; i <= 500; i++) {
    const padded = String(i).padStart(3, '0');
    const isFemale = i === 1 ? true : rng() > 0.52;
    const first =
      i === 1
        ? 'Ayesha'
        : isFemale
          ? FIRST_NAMES_FEMALE[Math.floor(rng() * FIRST_NAMES_FEMALE.length)]
          : FIRST_NAMES_MALE[Math.floor(rng() * FIRST_NAMES_MALE.length)];
    const last = i === 1 ? 'Gillani' : LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
    const fullName = `${first} ${last}`;
    const initials = `${first[0]}${last[0]}`.toUpperCase();

    const prog = i === 1 ? PROGRAMS[0] : PROGRAMS[i % PROGRAMS.length];
    const dept = DEPARTMENTS.find((d) => d.id === prog.departmentId) ?? DEPARTMENTS[0];
    const admissionYear = prog.durationYears === 2 ? 2025 : i % 3 === 0 ? 2023 : 2024;
    const expectedCompletionYear = admissionYear + prog.durationYears;
    const semester = i === 1 ? 5 : prog.durationYears === 2 ? 3 : admissionYear === 2023 ? 7 : 5;
    const section = i <= 150 ? 'A' : i <= 350 ? 'B' : 'A';

    // Enrolled courses matching student's department
    const deptCourses = courses.filter((c) => c.departmentId === dept.id);
    const enrolledCourses =
      i === 1
        ? courses.filter((c) => ['crs-math-301', 'crs-math-303', 'crs-math-305'].includes(c.id))
        : deptCourses.slice(0, 3);

    const history: AcademicCourseRecord[] = [
      {
        courseCode: `${dept.code}-101`,
        courseTitle: `Foundations of ${dept.code}`,
        creditHours: 3,
        semesterNumber: 1,
        grade: gradeEntries[i % 4].grade,
        gradePoints: gradeEntries[i % 4].pts,
        status: 'completed',
      },
      {
        courseCode: `${dept.code}-201`,
        courseTitle: `Intermediate ${dept.code} Methods`,
        creditHours: 3,
        semesterNumber: 3,
        grade: gradeEntries[(i + 1) % gradeEntries.length].grade,
        gradePoints: gradeEntries[(i + 1) % gradeEntries.length].pts,
        status: 'completed',
      },
      {
        courseCode: `${dept.code}-204`,
        courseTitle: `Applied ${dept.code} Seminar`,
        creditHours: 3,
        semesterNumber: 4,
        grade: gradeEntries[(i + 2) % gradeEntries.length].grade,
        gradePoints: gradeEntries[(i + 2) % gradeEntries.length].pts,
        status: 'completed',
      },
      ...enrolledCourses.map((c) => ({
        courseCode: c.code,
        courseTitle: c.title,
        creditHours: c.creditHours,
        semesterNumber: semester,
        status: 'enrolled' as const,
      })),
      {
        courseCode: `${dept.code}-499`,
        courseTitle: 'Capstone Research Project',
        creditHours: 3,
        semesterNumber: prog.totalSemesters,
        status: 'planned',
      },
    ];

    students.push({
      id: `student-${padded}`,
      role: 'student',
      name: fullName,
      email: `student${padded}@bzu.edu.pk`,
      password: i === 1 ? 'BzuDemo#Stu001' : deterministicPassword('S', i),
      avatarInitials: initials,
      avatarColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
      studentId: `BZU-STU-${String(i).padStart(4, '0')}`,
      rollNumber: `${prog.degreeLevel}-${dept.code}-${String(admissionYear).slice(2)}-${padded}`,
      registrationNumber: `${admissionYear}-BZU-${String(1000 + i)}`,
      departmentId: dept.id,
      programId: prog.id,
      batch: `${admissionYear}-${expectedCompletionYear}`,
      admissionYear,
      expectedCompletionYear,
      semester,
      section,
      enrolledCourseIds: enrolledCourses.map((c) => c.id),
      academicHistory: history,
      cgpa: computeCgpaFromHistory(history),
      active: true,
    });
  }

  // 4. Seed 1 Admin (admin@admin.bzu.edu.pk)
  const admins: AdminAccount[] = [
    {
      id: 'admin-001',
      role: 'admin',
      name: 'Prof. Sajjad Hussain Bukhari',
      title: 'Controller of Examinations (Demo)',
      email: 'admin@admin.bzu.edu.pk',
      password: 'BzuDemo#Admin01',
      avatarInitials: 'SB',
      avatarColor: '#B45309',
      employeeId: 'BZU-ADM-001',
      active: true,
    },
  ];

  // 5. Seed Questions (MCQs, Short, Long with Unicode Math)
  const questions: QuestionItem[] = [
    {
      id: 'q-math301-1',
      courseId: 'crs-math-301',
      sectionTitle: 'Section A — Objective (MCQs)',
      type: 'mcq',
      prompt: 'Let (X, d) be a metric space. Every Cauchy sequence in X converges in X if and only if X is:',
      points: 2,
      order: 1,
      options: ['Compact', 'Complete', 'Connected', 'Separable'],
      correctOptionIndex: 1,
      tags: ['Metric Spaces', 'Real Analysis'],
      createdByTeacherId: 'teacher-001',
    },
    {
      id: 'q-math301-2',
      courseId: 'crs-math-301',
      sectionTitle: 'Section A — Objective (MCQs)',
      type: 'mcq',
      prompt: 'Which of the following series converges conditionally but NOT absolutely?',
      points: 2,
      order: 2,
      options: ['∑ 1/n²', '∑ (-1)ⁿ / n', '∑ (-1)ⁿ / n²', '∑ 1/n'],
      correctOptionIndex: 1,
      tags: ['Infinite Series'],
      createdByTeacherId: 'teacher-001',
    },
    {
      id: 'q-math301-3',
      courseId: 'crs-math-301',
      sectionTitle: 'Section A — Objective (MCQs)',
      type: 'mcq',
      prompt: 'By the Bolzano–Weierstrass Theorem, every bounded sequence in ℝⁿ has:',
      points: 2,
      order: 3,
      options: ['A unique limit', 'A monotonic increasing limit', 'A convergent subsequence', 'Zero accumulation points'],
      correctOptionIndex: 2,
      tags: ['Sequences'],
      createdByTeacherId: 'teacher-001',
    },
    {
      id: 'q-math301-4',
      courseId: 'crs-math-301',
      sectionTitle: 'Section A — Objective (MCQs)',
      type: 'mcq',
      prompt: 'If f : [a, b] → ℝ is continuous on [a, b], then f is guaranteed to be:',
      points: 2,
      order: 4,
      options: ['Differentiable on (a, b)', 'Uniformly continuous on [a, b]', 'Monotonic on [a, b]', 'Linear'],
      correctOptionIndex: 1,
      tags: ['Continuity'],
      createdByTeacherId: 'teacher-001',
    },
    {
      id: 'q-math301-5',
      courseId: 'crs-math-301',
      sectionTitle: 'Section A — Objective (MCQs)',
      type: 'mcq',
      prompt: 'The supremum of the set S = { 1 - 1/n : n ∈ ℕ } is equal to:',
      points: 2,
      order: 5,
      options: ['0', '1/2', '1', '∞'],
      correctOptionIndex: 2,
      tags: ['Completeness Axiom'],
      createdByTeacherId: 'teacher-001',
    },
    {
      id: 'q-math301-6',
      courseId: 'crs-math-301',
      sectionTitle: 'Section B — Subjective',
      type: 'short',
      prompt: 'Define uniform continuity for f : E → ℝ and state why f(x) = 1/x fails to be uniformly continuous on (0, 1).',
      instructions: 'Be concise (4–6 sentences) or upload your handwritten sheet in the single combined PDF.',
      points: 5,
      order: 6,
      sampleRubric: '2 pts for ε-δ definition; 3 pts for counterexample sequence xₙ = 1/n, yₙ = 1/(n+1).',
      tags: ['Uniform Continuity'],
      createdByTeacherId: 'teacher-001',
    },
    {
      id: 'q-math301-7',
      courseId: 'crs-math-301',
      sectionTitle: 'Section B — Subjective',
      type: 'long',
      prompt: 'State and prove the Nested Interval Property in ℝ using the Completeness Axiom, and explain its geometric meaning.',
      instructions: 'Show all steps clearly. You may type with math symbols or upload one combined PDF.',
      points: 15,
      order: 7,
      sampleRubric: '5 pts statement; 8 pts proof via sup{aₙ}; 2 pts geometric remark.',
      tags: ['Completeness'],
      createdByTeacherId: 'teacher-001',
    },
    // ODE MATH-303 questions
    {
      id: 'q-math303-1',
      courseId: 'crs-math-303',
      sectionTitle: 'Section A — Objective',
      type: 'mcq',
      prompt: 'The Wronskian W(y₁, y₂) of two linearly independent solutions of y″ + p(x)y′ + q(x)y = 0 on an open interval I is:',
      points: 2,
      order: 1,
      options: ['Identically zero', 'Never zero on I', 'Equal to 1 everywhere', 'Undefined'],
      correctOptionIndex: 1,
      tags: ['ODEs'],
      createdByTeacherId: 'teacher-001',
    },
    {
      id: 'q-math303-2',
      courseId: 'crs-math-303',
      sectionTitle: 'Section A — Objective',
      type: 'mcq',
      prompt: 'What is the integrating factor for the linear first-order ODE dy/dx + (2/x)y = x² (x > 0)?',
      points: 2,
      order: 2,
      options: ['e²ˣ', 'x²', '2 ln(x)', '1/x²'],
      correctOptionIndex: 1,
      tags: ['First-Order ODE'],
      createdByTeacherId: 'teacher-001',
    },
    {
      id: 'q-math303-3',
      courseId: 'crs-math-303',
      sectionTitle: 'Section B — Subjective',
      type: 'long',
      prompt: 'Solve the initial value problem y″ - 4y′ + 4y = e²ˣ, y(0) = 1, y′(0) = 3 using Variation of Parameters or Undetermined Coefficients.',
      points: 16,
      order: 3,
      sampleRubric: '6 pts homogeneous solution; 6 pts particular solution; 4 pts constants.',
      tags: ['Second-Order ODE'],
      createdByTeacherId: 'teacher-001',
    },
    // Numerical Computing MATH-305
    {
      id: 'q-math305-1',
      courseId: 'crs-math-305',
      sectionTitle: 'Section A — Objective',
      type: 'mcq',
      prompt: 'The Newton–Raphson method exhibits what order of convergence near a simple root?',
      points: 5,
      order: 1,
      options: ['Linear', 'Quadratic', 'Cubic', 'Sublinear'],
      correctOptionIndex: 1,
      tags: ['Root Finding'],
      createdByTeacherId: 'teacher-001',
    },
    {
      id: 'q-math305-2',
      courseId: 'crs-math-305',
      sectionTitle: 'Section B — Subjective',
      type: 'short',
      prompt: 'Compare Simpson’s 1/3 Rule with the Composite Trapezoidal Rule in terms of truncation error O(hⁿ).',
      points: 15,
      order: 2,
      tags: ['Numerical Integration'],
      createdByTeacherId: 'teacher-001',
    },
  ];

  // 6. Seed Exams:
  //    - Interactive Demo Exam Sandbox (anchored around nowMs so it is ALWAYS live & testable!)
  //    - Submitted / Under Review / Pending Revision exam
  //    - Published Result exam (with checked annotated PDF)
  //    - Upcoming Official Fall 2026 Final Exam slot (2027-01-05 inside 2027-01-01..2027-01-11)
  //    - Upcoming Official Spring 2027 Midterm Exam slot (2027-03-26 inside 2027-03-24..2027-03-30)
  const sandboxStart = new Date(nowMs - 15 * 60 * 1000).toISOString(); // Started 15 mins ago
  const sandboxEnd = new Date(nowMs + 45 * 60 * 1000).toISOString(); // Ends in 45 mins (60-min fixed window)
  const sandboxPublish = new Date(nowMs + 2 * 60 * 60 * 1000).toISOString();

  const pastStart = new Date(nowMs - 4 * 24 * 60 * 60 * 1000).toISOString();
  const pastEnd = new Date(nowMs - 4 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString();

  const olderStart = new Date(nowMs - 14 * 24 * 60 * 60 * 1000).toISOString();
  const olderEnd = new Date(nowMs - 14 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString();

  const exams: Exam[] = [
    {
      id: 'exam-sandbox-live',
      title: 'Interactive Demo Exam — Real Analysis I (Live Sandbox)',
      courseId: 'crs-math-301',
      section: 'A',
      type: 'Quiz',
      instructions:
        'INTERACTIVE DEMO SANDBOX: Fixed 60-minute wall-clock window anchored on initialization. Switching browser tabs logs an integrity warning (does not silently auto-submit on a single switch). Answer all MCQs (scores withheld until publication) and complete Section B via typed response or a single combined PDF.',
      totalMarks: 30,
      startAt: sandboxStart,
      endAt: sandboxEnd,
      publishAt: sandboxPublish,
      isPublishedToStudents: true,
      isInteractiveSandbox: true,
      isDemoSlotLabel: 'Interactive Demo Sandbox — Rolling Window (Demo time)',
      semesterCalendarRef: 'sandbox',
      questionIds: [
        'q-math301-1',
        'q-math301-2',
        'q-math301-3',
        'q-math301-4',
        'q-math301-5',
        'q-math301-6',
        'q-math301-7',
      ],
      integrity: {
        warnOnTabSwitch: true,
        strictModeEnabled: false,
        strictWarningThreshold: 3,
      },
      createdByTeacherId: 'teacher-001',
      rescheduleHistory: [],
    },
    {
      id: 'exam-math303-review',
      title: 'Ordinary Differential Equations — Midterm Assessment',
      courseId: 'crs-math-303',
      section: 'A',
      type: 'Midterm',
      instructions: 'Show complete integration steps and Wronskian proofs.',
      totalMarks: 20,
      startAt: pastStart,
      endAt: pastEnd,
      publishAt: new Date(nowMs + 24 * 60 * 60 * 1000).toISOString(),
      isPublishedToStudents: true,
      isDemoSlotLabel: 'Demo exam slot — not an official BZU date sheet',
      semesterCalendarRef: 'fall-2026',
      questionIds: ['q-math303-1', 'q-math303-2', 'q-math303-3'],
      integrity: {
        warnOnTabSwitch: true,
        strictModeEnabled: false,
        strictWarningThreshold: 3,
      },
      createdByTeacherId: 'teacher-001',
      rescheduleHistory: [],
    },
    {
      id: 'exam-math305-published',
      title: 'Numerical Computing — Class Test I',
      courseId: 'crs-math-305',
      section: 'B',
      type: 'Class Test',
      instructions: 'Compare numerical error bounds concisely.',
      totalMarks: 20,
      startAt: olderStart,
      endAt: olderEnd,
      publishAt: new Date(nowMs - 10 * 24 * 60 * 60 * 1000).toISOString(),
      isPublishedToStudents: true,
      isDemoSlotLabel: 'Demo exam slot — not an official BZU date sheet',
      semesterCalendarRef: 'fall-2026',
      questionIds: ['q-math305-1', 'q-math305-2'],
      integrity: {
        warnOnTabSwitch: true,
        strictModeEnabled: false,
        strictWarningThreshold: 3,
      },
      createdByTeacherId: 'teacher-001',
      rescheduleHistory: [],
    },
    {
      id: 'exam-fall26-final-math301',
      title: 'Real Analysis I — Fall 2026 Final Examination',
      courseId: 'crs-math-301',
      section: 'A',
      type: 'Final Term',
      instructions: 'Official Fall 2026 Final Window slot (Demo time: 10:00 AM–12:00 PM Asia/Karachi).',
      totalMarks: 30,
      startAt: '2027-01-05T10:00:00+05:00',
      endAt: '2027-01-05T12:00:00+05:00',
      publishAt: '2027-01-15T14:00:00+05:00',
      isPublishedToStudents: true,
      isDemoSlotLabel: 'Demo exam slot — not an official BZU date sheet',
      semesterCalendarRef: 'fall-2026',
      questionIds: ['q-math301-1', 'q-math301-2', 'q-math301-6', 'q-math301-7'],
      integrity: {
        warnOnTabSwitch: true,
        strictModeEnabled: true,
        strictWarningThreshold: 3,
      },
      createdByTeacherId: 'teacher-001',
      rescheduleHistory: [],
    },
    {
      id: 'exam-spring27-midterm-cs301',
      title: 'Design & Analysis of Algorithms — Spring 2027 Midterm',
      courseId: 'crs-cs-301',
      section: 'A',
      type: 'Midterm',
      instructions: 'Spring 2027 Midterm Window slot (Demo time: 09:30 AM–11:00 AM Asia/Karachi).',
      totalMarks: 20,
      startAt: '2027-03-26T09:30:00+05:00',
      endAt: '2027-03-26T11:00:00+05:00',
      publishAt: '2027-04-05T10:00:00+05:00',
      isPublishedToStudents: true,
      isDemoSlotLabel: 'Demo exam slot — not an official BZU date sheet',
      semesterCalendarRef: 'spring-2027',
      questionIds: [],
      integrity: {
        warnOnTabSwitch: true,
        strictModeEnabled: false,
        strictWarningThreshold: 3,
      },
      createdByTeacherId: 'teacher-002',
      rescheduleHistory: [],
    },
  ];

  // 7. Seed Assignments (Open & Closed)
  const assignments: Assignment[] = [
    {
      id: 'asg-math301-1',
      title: 'Metric Space Completeness & Cantor Sets Problem Set',
      courseId: 'crs-math-301',
      section: 'A',
      instructions: 'Submit typed proofs or upload a single combined PDF before the deadline.',
      totalMarks: 20,
      openAt: new Date(nowMs - 5 * 24 * 60 * 60 * 1000).toISOString(),
      dueAt: new Date(nowMs + 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdByTeacherId: 'teacher-001',
      isDemoSlotLabel: 'Demo assignment deadline (Asia/Karachi)',
    },
    {
      id: 'asg-math303-closed',
      title: 'Laplace Transforms & Series Solutions Drill',
      courseId: 'crs-math-303',
      section: 'A',
      instructions: 'Closed practice assignment.',
      totalMarks: 15,
      openAt: new Date(nowMs - 15 * 24 * 60 * 60 * 1000).toISOString(),
      dueAt: new Date(nowMs - 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdByTeacherId: 'teacher-001',
      isDemoSlotLabel: 'Demo assignment deadline (Asia/Karachi)',
    },
  ];

  const assignmentSubmissions: AssignmentSubmission[] = [
    {
      id: 'asub-stu1-closed',
      assignmentId: 'asg-math303-closed',
      studentId: 'student-001',
      submittedAt: new Date(nowMs - 3 * 24 * 60 * 60 * 1000).toISOString(),
      textResponse: 'Submitted Laplace transform solutions for problems 1–5.',
      status: 'Graded',
      marksObtained: 13,
      teacherFeedback: 'Clear derivation of convolution theorem.',
    },
  ];

  // 8. Generate real valid PDFs in-browser for seeded submissions
  const pdfAssets: StoredPdfAsset[] = [];

  const pdfStu1Ode = generateSampleAnswerPdfBase64({
    studentName: students[0].name,
    rollNumber: students[0].rollNumber,
    courseCode: 'MATH-303',
    examTitle: 'Ordinary Differential Equations — Midterm Assessment',
    answerParagraphs: [
      'Question 3 (Initial Value Problem): y\'\' - 4y\' + 4y = e^(2x), y(0) = 1, y\'(0) = 3.',
      'Step 1 (Homogeneous Solution): Characteristic equation r^2 - 4r + 4 = (r - 2)^2 = 0 gives repeated root r = 2. Hence y_h(x) = (C1 + C2*x) e^(2x).',
      'Step 2 (Particular Solution): Since e^(2x) and x*e^(2x) already appear in y_h, we try y_p(x) = A * x^2 * e^(2x). Differentiating twice and substituting into the LHS gives 2A * e^(2x) = e^(2x), so A = 1/2.',
      'Step 3 (General Solution & Initial Conditions): y(x) = (C1 + C2*x + 0.5*x^2) e^(2x). Using y(0) = 1 yields C1 = 1. Differentiating: y\'(0) = 2*C1 + C2 = 3, giving C2 = 1.',
      'Final Answer: y(x) = (1 + x + 0.5*x^2) e^(2x).',
    ],
  });
  pdfAssets.push({
    id: 'pdf-asset-stu1-ode',
    fileName: 'Ayesha_Gillani_MATH303_Midterm.pdf',
    mimeType: 'application/pdf',
    sizeBytes: Math.floor((pdfStu1Ode.length * 3) / 4),
    base64Data: pdfStu1Ode,
    createdAt: pastEnd,
  });

  const pdfStu1Num = generateSampleAnswerPdfBase64({
    studentName: students[0].name,
    rollNumber: students[0].rollNumber,
    courseCode: 'MATH-305',
    examTitle: 'Numerical Computing — Class Test I',
    answerParagraphs: [
      'Question 2: Comparison of Composite Trapezoidal Rule and Simpson\'s 1/3 Rule.',
      '1. Composite Trapezoidal Rule approximates f(x) on each subinterval using linear interpolation (degree 1 polynomial), yielding global truncation error O(h^2).',
      '2. Simpson\'s 1/3 Rule fits quadratic Lagrange polynomials across pairs of subintervals (requires even number of subintervals n), achieving higher global accuracy of O(h^4) because cubic terms integrate symmetrically to zero.',
      '3. Practical Note: For smooth functions on [a, b], Simpson\'s 1/3 Rule achieves 10^-6 precision with significantly fewer function evaluations than Trapezoidal.',
    ],
  });
  pdfAssets.push({
    id: 'pdf-asset-stu1-num',
    fileName: 'Ayesha_Gillani_MATH305_ClassTest.pdf',
    mimeType: 'application/pdf',
    sizeBytes: Math.floor((pdfStu1Num.length * 3) / 4),
    base64Data: pdfStu1Num,
    createdAt: olderEnd,
  });

  const pdfStu8Ode = generateSampleAnswerPdfBase64({
    studentName: students[7].name,
    rollNumber: students[7].rollNumber,
    courseCode: 'MATH-303',
    examTitle: 'Ordinary Differential Equations — Midterm Assessment',
    answerParagraphs: [
      'Question 3 Solution:',
      'Homogeneous characteristic roots r1 = r2 = 2, so y_h = (c1 + c2*x)e^(2x).',
      'Particular integral via variation of parameters: W(e^(2x), x e^(2x)) = e^(4x).',
      'u1\' = -x, u2\' = 1 => y_p = 0.5 x^2 e^(2x). Initial values yield c1 = 1, c2 = 1.',
    ],
  });
  pdfAssets.push({
    id: 'pdf-asset-stu8-ode',
    fileName: `${students[7].name.replace(/\s+/g, '_')}_MATH303.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: Math.floor((pdfStu8Ode.length * 3) / 4),
    base64Data: pdfStu8Ode,
    createdAt: pastEnd,
  });

  // 9. Seed Submissions (including submitted/ungraded, saved initial marks with pending revision, published with overlay annotations)
  const odeQuestions = questions.filter((q) => q.courseId === 'crs-math-303');
  const numQuestions = questions.filter((q) => q.courseId === 'crs-math-305');

  const submissions: ExamSubmission[] = [
    // Student 001 MATH-303 Midterm: Initial marks saved (12/16), Pending Admin Revision Request (14/16) -> Result Held!
    {
      id: 'sub-stu1-math303',
      examId: 'exam-math303-review',
      studentId: 'student-001',
      startedAt: pastStart,
      submittedAt: new Date(Date.parse(pastStart) + 48 * 60 * 1000).toISOString(),
      isFinalized: true,
      lockedReason: 'manual_submit',
      receiptCode: 'BZU-RCP-303-001',
      mcqAnswers: { 'q-math303-1': 1, 'q-math303-2': 1 }, // 4/4 MCQ
      flaggedQuestionIds: [],
      subjectiveTextAnswers: {
        'q-math303-3': 'Uploaded complete derivation in attached PDF.',
      },
      subjectivePdfAssetId: 'pdf-asset-stu1-ode',
      subjectivePdfFileName: 'Ayesha_Gillani_MATH303_Midterm.pdf',
      subjectivePdfSizeBytes: pdfAssets[0].sizeBytes,
      lastSavedAt: new Date(Date.parse(pastStart) + 48 * 60 * 1000).toISOString(),
      mcqAutoScore: computeMcqAutoScore({ 'q-math303-1': 1, 'q-math303-2': 1 }, odeQuestions),
      subjectiveQuestionScores: { 'q-math303-3': 12 },
      teacherRemarks: 'Clean homogeneous & particular integral derivation; minor sign check pending.',
      initialMarksSaved: true,
      initialMarksSavedAt: new Date(nowMs - 2 * 24 * 60 * 60 * 1000).toISOString(),
      initialMarksSavedBy: 'teacher-001',
      resultPublished: false,
      annotations: [
        {
          id: 'ann-seed-1',
          pageNumber: 1,
          kind: 'checkmark',
          color: '#16A34A',
          rect: { x: 0.82, y: 0.34, w: 0.05, h: 0.05 },
          text: 'Correct characteristic root r=2',
          createdAt: new Date(nowMs - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'ann-seed-2',
          pageNumber: 1,
          kind: 'comment',
          color: '#D97706',
          rect: { x: 0.12, y: 0.52, w: 0.3, h: 0.05 },
          text: 'Verify initial condition derivative calculation (+2 marks requested)',
          createdAt: new Date(nowMs - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      incidents: [],
    },
    // Student 008 MATH-303 Midterm: Finalized, NOT YET GRADED (so Teacher can practice fresh initial grading!)
    {
      id: 'sub-stu8-math303',
      examId: 'exam-math303-review',
      studentId: students[7].id,
      startedAt: pastStart,
      submittedAt: new Date(Date.parse(pastStart) + 52 * 60 * 1000).toISOString(),
      isFinalized: true,
      lockedReason: 'manual_submit',
      receiptCode: 'BZU-RCP-303-008',
      mcqAnswers: { 'q-math303-1': 1, 'q-math303-2': 0 }, // 2/4 MCQ
      flaggedQuestionIds: [],
      subjectiveTextAnswers: {
        'q-math303-3': 'Solved via variation of parameters in attached PDF.',
      },
      subjectivePdfAssetId: 'pdf-asset-stu8-ode',
      subjectivePdfFileName: pdfAssets[2].fileName,
      subjectivePdfSizeBytes: pdfAssets[2].sizeBytes,
      lastSavedAt: new Date(Date.parse(pastStart) + 52 * 60 * 1000).toISOString(),
      mcqAutoScore: computeMcqAutoScore({ 'q-math303-1': 1, 'q-math303-2': 0 }, odeQuestions),
      subjectiveQuestionScores: {},
      initialMarksSaved: false,
      resultPublished: false,
      annotations: [],
      incidents: [
        {
          id: 'inc-seed-1',
          examId: 'exam-math303-review',
          studentId: students[7].id,
          timestamp: new Date(Date.parse(pastStart) + 21 * 60 * 1000).toISOString(),
          type: 'visibility_hidden',
          detail: 'Browser tab lost visibility for 6 seconds during demo attempt.',
        },
      ],
    },
    // Student 001 MATH-305 Class Test: PUBLISHED Result with checked annotated PDF!
    {
      id: 'sub-stu1-math305',
      examId: 'exam-math305-published',
      studentId: 'student-001',
      startedAt: olderStart,
      submittedAt: new Date(Date.parse(olderStart) + 41 * 60 * 1000).toISOString(),
      isFinalized: true,
      lockedReason: 'manual_submit',
      receiptCode: 'BZU-RCP-305-001',
      mcqAnswers: { 'q-math305-1': 1 }, // 5/5 MCQ
      flaggedQuestionIds: [],
      subjectiveTextAnswers: {
        'q-math305-2': 'Simpson 1/3 achieves O(h^4) whereas Trapezoidal achieves O(h^2).',
      },
      subjectivePdfAssetId: 'pdf-asset-stu1-num',
      subjectivePdfFileName: 'Ayesha_Gillani_MATH305_ClassTest.pdf',
      subjectivePdfSizeBytes: pdfAssets[1].sizeBytes,
      lastSavedAt: new Date(Date.parse(olderStart) + 41 * 60 * 1000).toISOString(),
      mcqAutoScore: computeMcqAutoScore({ 'q-math305-1': 1 }, numQuestions),
      subjectiveQuestionScores: { 'q-math305-2': 13 },
      teacherRemarks: 'Excellent explanation of cubic polynomial cancellation in Simpson 1/3 Rule.',
      initialMarksSaved: true,
      initialMarksSavedAt: new Date(nowMs - 11 * 24 * 60 * 60 * 1000).toISOString(),
      initialMarksSavedBy: 'teacher-001',
      resultPublished: true,
      resultPublishedAt: new Date(nowMs - 10 * 24 * 60 * 60 * 1000).toISOString(),
      annotations: [
        {
          id: 'ann-pub-1',
          pageNumber: 1,
          kind: 'highlight',
          color: '#F59E0B',
          rect: { x: 0.08, y: 0.30, w: 0.78, h: 0.06 },
          createdAt: new Date(nowMs - 11 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'ann-pub-2',
          pageNumber: 1,
          kind: 'checkmark',
          color: '#16A34A',
          rect: { x: 0.85, y: 0.30, w: 0.05, h: 0.05 },
          text: '13 / 15 — Clear O(h^4) error analysis',
          createdAt: new Date(nowMs - 11 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      incidents: [],
    },
  ];

  // 10. Seed Marks Revision Requests covering Pending, Approved, and Rejected states
  const revisionRequests: MarksRevisionRequest[] = [
    {
      id: 'REV-2026-001',
      submissionId: 'sub-stu1-math303',
      examId: 'exam-math303-review',
      courseId: 'crs-math-303',
      studentId: 'student-001',
      teacherId: 'teacher-001',
      oldSubjectiveTotal: 12,
      proposedSubjectiveTotal: 14,
      proposedQuestionScores: { 'q-math303-3': 14 },
      oldRemarks: 'Clean homogeneous & particular integral derivation; minor sign check pending.',
      proposedRemarks: 'Verified initial condition derivative y\'(0)=3; full method credit awarded.',
      justification: 'Recheck showed student correctly evaluated C2 = 1 on page 1; +2 marks missed during initial pass.',
      status: 'pending',
      requestedAt: new Date(nowMs - 18 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'REV-2026-002',
      submissionId: 'sub-stu1-math305',
      examId: 'exam-math305-published',
      courseId: 'crs-math-305',
      studentId: 'student-001',
      teacherId: 'teacher-001',
      oldSubjectiveTotal: 11,
      proposedSubjectiveTotal: 13,
      proposedQuestionScores: { 'q-math305-2': 13 },
      oldRemarks: 'Good summary.',
      proposedRemarks: 'Excellent explanation of cubic polynomial cancellation in Simpson 1/3 Rule.',
      justification: 'Student included explicit O(h^4) Peano kernel note overlooked in initial grading.',
      status: 'approved',
      requestedAt: new Date(nowMs - 12 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedByAdminId: 'admin-001',
      decisionNote: 'Verified against uploaded PDF annotation; revision approved prior to result publication.',
      decidedAt: new Date(nowMs - 11 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'REV-2026-003',
      submissionId: 'sub-stu1-math305',
      examId: 'exam-math305-published',
      courseId: 'crs-math-305',
      studentId: 'student-001',
      teacherId: 'teacher-001',
      oldSubjectiveTotal: 13,
      proposedSubjectiveTotal: 15,
      proposedQuestionScores: { 'q-math305-2': 15 },
      oldRemarks: 'Excellent explanation of cubic polynomial cancellation in Simpson 1/3 Rule.',
      proposedRemarks: 'Bonus attempt consideration.',
      justification: 'Requesting +2 bonus marks for neatness.',
      status: 'rejected',
      requestedAt: new Date(nowMs - 11 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedByAdminId: 'admin-001',
      decisionNote: 'Rejected: Syllabus rubric does not permit neatness bonus beyond question max points.',
      decidedAt: new Date(nowMs - 10.5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // 11. Seed Audit Logs & Notifications
  const auditLogs: AuditLogEntry[] = [
    {
      id: 'aud-1',
      timestamp: new Date(nowMs - 11 * 24 * 60 * 60 * 1000).toISOString(),
      actorId: 'admin-001',
      actorRole: 'admin',
      actorName: admins[0].name,
      action: 'REVISION_APPROVED',
      targetType: 'revision',
      targetId: 'REV-2026-002',
      summary: 'Approved pre-publication marks revision for Ayesha Gillani (MATH-305: 11 -> 13).',
    },
    {
      id: 'aud-2',
      timestamp: new Date(nowMs - 10.5 * 24 * 60 * 60 * 1000).toISOString(),
      actorId: 'admin-001',
      actorRole: 'admin',
      actorName: admins[0].name,
      action: 'REVISION_REJECTED',
      targetType: 'revision',
      targetId: 'REV-2026-003',
      summary: 'Rejected marks revision REV-2026-003 (neatness bonus outside rubric).',
    },
    {
      id: 'aud-3',
      timestamp: new Date(nowMs - 18 * 60 * 60 * 1000).toISOString(),
      actorId: 'teacher-001',
      actorRole: 'teacher',
      actorName: teachers[0].name,
      action: 'REVISION_REQUESTED',
      targetType: 'revision',
      targetId: 'REV-2026-001',
      summary: 'Requested pre-publication revision for Ayesha Gillani (MATH-303: 12 -> 14). Result publication held.',
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif-1',
      recipientId: 'student-001',
      roleScope: 'student',
      title: 'Interactive Demo Exam Available Now',
      message: 'Real Analysis I (MATH-301) Interactive Demo Sandbox is open for a 60-minute fixed window.',
      createdAt: sandboxStart,
      read: false,
      linkTo: '/student/exams',
    },
    {
      id: 'notif-2',
      recipientId: 'student-001',
      roleScope: 'student',
      title: 'Result Published: MATH-305 Class Test I',
      message: 'Your combined MCQ + subjective result for Numerical Computing has been published.',
      createdAt: new Date(nowMs - 10 * 24 * 60 * 60 * 1000).toISOString(),
      read: false,
      linkTo: '/student/results',
    },
    {
      id: 'notif-3',
      recipientId: 'teacher-001',
      roleScope: 'teacher',
      title: 'Result Publication Held: MATH-303 Midterm',
      message: 'Marks revision REV-2026-001 is pending Admin approval. Result release is held until resolved.',
      createdAt: new Date(nowMs - 18 * 60 * 60 * 1000).toISOString(),
      read: false,
      linkTo: '/teacher/revisions',
    },
    {
      id: 'notif-4',
      recipientId: 'admin-001',
      roleScope: 'admin',
      title: '1 Pending Marks Revision Approval',
      message: 'Dr. Tariq Mahmood Qureshi submitted REV-2026-001 for MATH-303.',
      createdAt: new Date(nowMs - 18 * 60 * 60 * 1000).toISOString(),
      read: false,
      linkTo: '/admin/revisions',
    },
  ];

  const db: UniversityDatabaseState = {
    version: 1,
    seededAt: nowIso,
    departments: DEPARTMENTS,
    programs: PROGRAMS,
    courses,
    students,
    teachers,
    admins,
    questions,
    exams,
    assignments,
    assignmentSubmissions,
    submissions,
    revisionRequests,
    auditLogs,
    notifications,
    policy: {
      allowStudentCheckedPaperView: true,
      perStudentCheckedPaperOverrides: {},
      gradeScaleLabel: 'BZU Demo Percentage-to-GPA Scale (Synthetic)',
      demoAnchorIso: nowIso,
    },
  };

  return { db, pdfAssets };
}
