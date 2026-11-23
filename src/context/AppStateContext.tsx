import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  AnyUserAccount,
  AssignmentSubmission,
  AuditLogEntry,
  Exam,
  ExamSubmission,
  MarksRevisionRequest,
  PdfAnnotationStroke,
  QuestionItem,
  StoredPdfAsset,
  UniversityDatabaseState,
  UserRole,
} from '../types/domain';
import {
  loadCompletedTours,
  loadDemoModeActive,
  loadOrSeedDatabase,
  loadSessionMeta,
  persistDatabaseState,
  resetDatabaseToSeed,
  saveCompletedTour,
  saveDemoModeActive,
  savePdfAssetToDb,
  saveSessionMeta,
} from '../lib/storage';
import { computeMcqAutoScore } from '../lib/gradeMath';
import {
  canPublishExamResultsNow,
  computeDemoExamWindow,
  resolveRevisionDecision,
} from '../lib/revisionPolicy';

export interface ToastItem {
  id: string;
  kind: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface AppStateContextValue {
  db: UniversityDatabaseState | null;
  loading: boolean;
  storageError: string | null;
  currentUser: AnyUserAccount | null;
  activeExamAttemptId: string | null;
  setActiveExamAttemptId: (examId: string | null) => void;
  toasts: ToastItem[];
  pushToast: (kind: ToastItem['kind'], message: string) => void;
  dismissToast: (id: string) => void;

  // Auth & Role Demo Switching
  demoModeActive: boolean;
  launchDemoMode: (targetRole?: UserRole) => void;
  exitDemoMode: () => void;
  loginWithCredentials: (email: string, password: string) => { ok: boolean; error?: string; user?: AnyUserAccount };
  loginQuickDemoRole: (role: UserRole) => void;
  logout: () => void;

  // Guided Tour
  tourOpenForRole: UserRole | null;
  replayTour: () => void;
  closeTour: (markCompleted: boolean) => void;

  // Student Exam & Assignment Actions
  startOrResumeExamAttempt: (examId: string) => ExamSubmission | null;
  updateExamDraft: (
    examId: string,
    patch: Partial<Pick<ExamSubmission, 'mcqAnswers' | 'flaggedQuestionIds' | 'subjectiveTextAnswers' | 'subjectivePdfAssetId' | 'subjectivePdfFileName' | 'subjectivePdfSizeBytes'>>
  ) => Promise<void>;
  uploadPdfAsset: (asset: StoredPdfAsset) => Promise<void>;
  logExamIncident: (
    examId: string,
    type: 'visibility_hidden' | 'window_blur' | 'strict_auto_finalized',
    detail: string
  ) => Promise<number>;
  finalizeExamAttempt: (
    examId: string,
    reason: 'manual_submit' | 'deadline_expired' | 'strict_threshold',
    hasPendingPdfSelection?: boolean
  ) => Promise<ExamSubmission | null>;
  submitAssignmentResponse: (
    assignmentId: string,
    textResponse: string,
    pdfAsset?: StoredPdfAsset
  ) => Promise<void>;

  // Teacher Actions
  saveQuestion: (question: QuestionItem) => Promise<void>;
  saveManyQuestions: (questions: QuestionItem[]) => Promise<void>;
  createOrUpdateExam: (exam: Exam) => Promise<void>;
  startDemoExamNow: (examId: string, durationMinutes?: number) => Promise<void>;
  saveSubmissionAnnotations: (submissionId: string, annotations: PdfAnnotationStroke[]) => Promise<void>;
  saveMarkingProgressDraft: (
    submissionId: string,
    subjectiveScores: Record<string, number>,
    remarks: string
  ) => Promise<void>;
  saveInitialSubmissionMarks: (
    submissionId: string,
    subjectiveScores: Record<string, number>,
    remarks: string
  ) => Promise<void>;
  requestMarksRevision: (params: {
    submissionId: string;
    proposedScores: Record<string, number>;
    proposedRemarks: string;
    justification: string;
  }) => Promise<void>;
  publishSubmissionResults: (submissionIds: string[]) => Promise<{ publishedCount: number; heldCount: number }>;
  publishExamResultsNow: (examId: string) => Promise<{ publishedCount: number; reason?: string }>;
  gradeAssignmentSubmission: (submissionId: string, marks: number, feedback: string) => Promise<void>;

  // Admin Actions
  resolveMarksRevision: (
    revisionId: string,
    decision: 'approved' | 'rejected',
    decisionNote: string
  ) => Promise<void>;
  rescheduleExamWindow: (
    examId: string,
    newStartAt: string,
    newEndAt: string,
    reason: string
  ) => Promise<void>;
  updateCheckedPaperPolicy: (allowGlobal: boolean, perStudentOverrides?: Record<string, boolean>) => Promise<void>;
  toggleAccountActive: (role: 'student' | 'teacher', userId: string, active: boolean) => Promise<void>;
  markNotificationRead: (notifId: string) => Promise<void>;
  resetDemoDataset: () => Promise<void>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

function findUserByIdAndRole(
  db: UniversityDatabaseState,
  userId: string,
  role: UserRole
): AnyUserAccount | null {
  if (role === 'student') return db.students.find((s) => s.id === userId) ?? null;
  if (role === 'teacher') return db.teachers.find((t) => t.id === userId) ?? null;
  return db.admins.find((a) => a.id === userId) ?? null;
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<UniversityDatabaseState | null>(null);
  const dbRef = React.useRef<UniversityDatabaseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AnyUserAccount | null>(null);
  const [activeExamAttemptId, setActiveExamAttemptId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [tourOpenForRole, setTourOpenForRole] = useState<UserRole | null>(null);
  const [demoModeActive, setDemoModeActive] = useState<boolean>(() => loadDemoModeActive());

  const pushToast = useCallback((kind: ToastItem['kind'], message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const loaded = await loadOrSeedDatabase();
        if (!mounted) return;
        dbRef.current = loaded;
        setDb(loaded);
        const session = loadSessionMeta();
        if (session) {
          const user = findUserByIdAndRole(loaded, session.userId, session.role);
          if (user && user.active) {
            setCurrentUser(user);
          } else {
            saveSessionMeta(null);
          }
        }
      } catch (err) {
        if (!mounted) return;
        setStorageError(err instanceof Error ? err.message : 'Failed to initialize local database.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const commitState = useCallback(
    async (updater: (prev: UniversityDatabaseState) => UniversityDatabaseState) => {
      const current = dbRef.current;
      if (!current) return;
      const next = updater(current);
      dbRef.current = next;
      setDb(next);
      try {
        await persistDatabaseState(next);
        setStorageError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Storage write failed.';
        setStorageError(msg);
        pushToast('error', msg);
      }
    },
    [db, pushToast]
  );

  const initialAutostartRef = React.useRef<boolean>(
    typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).get('autostart') === '1' ||
        window.sessionStorage.getItem('bzu_autostart_mode') === '1')
  );

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('autostart') === '1'
    ) {
      window.sessionStorage.setItem('bzu_autostart_mode', '1');
    }
  }, []);

  const maybeOpenFirstTimeTour = useCallback(
    (role: UserRole) => {
      if (initialAutostartRef.current || demoModeActive) return;
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return;
      const completed = loadCompletedTours();
      if (!completed[role]) {
        setTourOpenForRole(role);
      }
    },
    [demoModeActive]
  );

  const loginWithCredentials = useCallback(
    (email: string, password: string) => {
      if (!db) return { ok: false, error: 'Database is still loading.' };
      const normalized = email.trim().toLowerCase();
      if (!normalized || !password) {
        return { ok: false, error: 'Please enter both your demo university email and password.' };
      }

      const allUsers: AnyUserAccount[] = [...db.students, ...db.teachers, ...db.admins];
      const match = allUsers.find((u) => u.email.toLowerCase() === normalized);
      if (!match) {
        return {
          ok: false,
          error: 'No synthetic demo account found for that email. Try student001@bzu.edu.pk, teacher001@bzu.edu.pk, or admin@admin.bzu.edu.pk.',
        };
      }
      if (!match.active) {
        return {
          ok: false,
          error: 'This demo account has been suspended by the Demo Admin.',
        };
      }
      if (match.password !== password) {
        return {
          ok: false,
          error: 'Invalid demo password. Open the Demo Credentials Drawer to copy or auto-fill valid demo credentials.',
        };
      }

      setCurrentUser(match);
      saveSessionMeta({ userId: match.id, role: match.role, loggedInAt: new Date().toISOString() });
      maybeOpenFirstTimeTour(match.role);
      pushToast('success', `Signed in as ${match.name} (${match.role.toUpperCase()} DEMO).`);
      return { ok: true, user: match };
    },
    [db, maybeOpenFirstTimeTour, pushToast]
  );

  const launchDemoMode = useCallback(
    (targetRole?: UserRole) => {
      if (!db) return;
      setDemoModeActive(true);
      saveDemoModeActive(true);
      const roleToUse = targetRole ?? currentUser?.role ?? 'teacher';
      if (!currentUser || (targetRole && currentUser.role !== targetRole)) {
        if (activeExamAttemptId) {
          pushToast('warning', 'Finish or submit your active exam attempt before switching roles.');
          return;
        }
        const user: AnyUserAccount | undefined =
          roleToUse === 'student'
            ? db.students[0]
            : roleToUse === 'teacher'
              ? db.teachers[0]
              : db.admins[0];
        if (user) {
          setCurrentUser(user);
          saveSessionMeta({ userId: user.id, role: user.role, loggedInAt: new Date().toISOString() });
        }
      }
      pushToast('success', 'Interactive Demo Mode launched. Official BZU schedule remains unchanged.');
    },
    [db, currentUser, activeExamAttemptId, pushToast]
  );

  const exitDemoMode = useCallback(() => {
    setDemoModeActive(false);
    saveDemoModeActive(false);
    pushToast('info', 'Exited Demo Mode highlight.');
  }, [pushToast]);

  const loginQuickDemoRole = useCallback(
    (role: UserRole) => {
      if (!db) return;
      if (activeExamAttemptId) {
        pushToast('warning', 'Finish or submit your active exam attempt before switching demo roles.');
        return;
      }
      const user: AnyUserAccount | undefined =
        role === 'student'
          ? db.students[0]
          : role === 'teacher'
            ? db.teachers[0]
            : db.admins[0];
      if (!user) return;
      setCurrentUser(user);
      saveSessionMeta({ userId: user.id, role: user.role, loggedInAt: new Date().toISOString() });
      maybeOpenFirstTimeTour(user.role);
      pushToast('info', `Switched to ${user.name} (${role.toUpperCase()} DEMO).`);
    },
    [db, activeExamAttemptId, maybeOpenFirstTimeTour, pushToast]
  );

  const logout = useCallback(() => {
    setActiveExamAttemptId(null);
    setCurrentUser(null);
    setTourOpenForRole(null);
    saveSessionMeta(null);
    pushToast('info', 'Signed out of demo session.');
  }, [pushToast]);

  const replayTour = useCallback(() => {
    if (currentUser) setTourOpenForRole(currentUser.role);
  }, [currentUser]);

  const closeTour = useCallback(
    (markCompleted: boolean) => {
      if (tourOpenForRole && markCompleted) {
        saveCompletedTour(tourOpenForRole, true);
      }
      setTourOpenForRole(null);
    },
    [tourOpenForRole]
  );

  const startOrResumeExamAttempt = useCallback(
    (examId: string): ExamSubmission | null => {
      if (!db || !currentUser || currentUser.role !== 'student') return null;
      const existing = db.submissions.find(
        (s) => s.examId === examId && s.studentId === currentUser.id
      );
      if (existing) return existing;

      const created: ExamSubmission = {
        id: `sub-${examId}-${currentUser.id}`,
        examId,
        studentId: currentUser.id,
        startedAt: new Date().toISOString(),
        isFinalized: false,
        mcqAnswers: {},
        flaggedQuestionIds: [],
        subjectiveTextAnswers: {},
        lastSavedAt: new Date().toISOString(),
        subjectiveQuestionScores: {},
        initialMarksSaved: false,
        resultPublished: false,
        annotations: [],
        incidents: [],
      };
      void commitState((prev) => ({
        ...prev,
        submissions: [...prev.submissions, created],
      }));
      return created;
    },
    [db, currentUser, commitState]
  );

  const updateExamDraft = useCallback(
    async (
      examId: string,
      patch: Partial<
        Pick<
          ExamSubmission,
          | 'mcqAnswers'
          | 'flaggedQuestionIds'
          | 'subjectiveTextAnswers'
          | 'subjectivePdfAssetId'
          | 'subjectivePdfFileName'
          | 'subjectivePdfSizeBytes'
        >
      >
    ) => {
      if (!db || !currentUser) return;
      await commitState((prev) => ({
        ...prev,
        submissions: prev.submissions.map((sub) => {
          if (sub.examId !== examId || sub.studentId !== currentUser.id || sub.isFinalized) {
            return sub;
          }
          return {
            ...sub,
            ...patch,
            lastSavedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    [db, currentUser, commitState]
  );

  const uploadPdfAsset = useCallback(async (asset: StoredPdfAsset) => {
    await savePdfAssetToDb(asset);
  }, []);

  const logExamIncident = useCallback(
    async (
      examId: string,
      type: 'visibility_hidden' | 'window_blur' | 'strict_auto_finalized',
      detail: string
    ): Promise<number> => {
      if (!db || !currentUser) return 0;
      const existing = db.submissions.find(
        (s) => s.examId === examId && s.studentId === currentUser.id
      );
      if (!existing || existing.isFinalized) return existing?.incidents.length ?? 0;

      const incident = {
        id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        examId,
        studentId: currentUser.id,
        timestamp: new Date().toISOString(),
        type,
        detail,
      };
      const newCount = existing.incidents.length + 1;

      await commitState((prev) => ({
        ...prev,
        submissions: prev.submissions.map((s) =>
          s.id === existing.id ? { ...s, incidents: [...s.incidents, incident] } : s
        ),
        auditLogs: [
          {
            id: `aud-${Date.now()}`,
            timestamp: incident.timestamp,
            actorId: currentUser.id,
            actorRole: currentUser.role,
            actorName: currentUser.name,
            action: 'EXAM_FOCUS_INCIDENT',
            targetType: 'exam',
            targetId: examId,
            summary: `${currentUser.name}: ${detail}`,
          },
          ...prev.auditLogs,
        ],
      }));
      return newCount;
    },
    [db, currentUser, commitState]
  );

  const finalizeExamAttempt = useCallback(
    async (
      examId: string,
      reason: 'manual_submit' | 'deadline_expired' | 'strict_threshold',
      hasPendingPdfSelection = false
    ): Promise<ExamSubmission | null> => {
      if (!db || !currentUser) return null;
      const exam = db.exams.find((e) => e.id === examId);
      const existing = db.submissions.find(
        (s) => s.examId === examId && s.studentId === currentUser.id
      );
      if (!exam || !existing) return null;
      // Idempotent submission guard
      if (existing.isFinalized) return existing;

      const examQuestions = db.questions.filter((q) => exam.questionIds.includes(q.id));
      const mcqAutoScore = computeMcqAutoScore(existing.mcqAnswers, examQuestions);
      const nowIso = new Date().toISOString();
      const receiptCode = `BZU-RCP-${exam.courseId.replace('crs-', '').toUpperCase()}-${String(Date.now()).slice(-4)}`;

      const finalized: ExamSubmission = {
        ...existing,
        isFinalized: true,
        submittedAt: nowIso,
        lockedReason: reason,
        receiptCode,
        mcqAutoScore,
        unsubmittedPdfWarning: hasPendingPdfSelection && !existing.subjectivePdfAssetId,
        lastSavedAt: nowIso,
      };

      await commitState((prev) => ({
        ...prev,
        submissions: prev.submissions.map((s) => (s.id === existing.id ? finalized : s)),
        auditLogs: [
          {
            id: `aud-${Date.now()}`,
            timestamp: nowIso,
            actorId: currentUser.id,
            actorRole: currentUser.role,
            actorName: currentUser.name,
            action: 'EXAM_SUBMITTED',
            targetType: 'submission',
            targetId: finalized.id,
            summary: `${currentUser.name} finalized "${exam.title}" (${reason}). Receipt: ${receiptCode}.`,
          },
          ...prev.auditLogs,
        ],
      }));
      setActiveExamAttemptId(null);
      return finalized;
    },
    [db, currentUser, commitState]
  );

  const submitAssignmentResponse = useCallback(
    async (assignmentId: string, textResponse: string, pdfAsset?: StoredPdfAsset) => {
      if (!db || !currentUser) return;
      if (pdfAsset) {
        await savePdfAssetToDb(pdfAsset);
      }
      const nowIso = new Date().toISOString();
      const existing = db.assignmentSubmissions.find(
        (s) => s.assignmentId === assignmentId && s.studentId === currentUser.id
      );
      const nextSub: AssignmentSubmission = {
        id: existing?.id ?? `asub-${assignmentId}-${currentUser.id}`,
        assignmentId,
        studentId: currentUser.id,
        submittedAt: nowIso,
        textResponse,
        pdfAssetId: pdfAsset?.id ?? existing?.pdfAssetId,
        pdfFileName: pdfAsset?.fileName ?? existing?.pdfFileName,
        status: 'Submitted',
      };

      await commitState((prev) => ({
        ...prev,
        assignmentSubmissions: existing
          ? prev.assignmentSubmissions.map((s) => (s.id === existing.id ? nextSub : s))
          : [...prev.assignmentSubmissions, nextSub],
      }));
      pushToast('success', 'Assignment submitted to local demo storage.');
    },
    [db, currentUser, commitState, pushToast]
  );

  const saveQuestion = useCallback(
    async (question: QuestionItem) => {
      if (!db) return;
      await commitState((prev) => {
        const exists = prev.questions.some((q) => q.id === question.id);
        return {
          ...prev,
          questions: exists
            ? prev.questions.map((q) => (q.id === question.id ? question : q))
            : [...prev.questions, question],
        };
      });
    },
    [db, commitState]
  );

  const saveManyQuestions = useCallback(
    async (questionsToAdd: QuestionItem[]) => {
      if (!db || questionsToAdd.length === 0) return;
      await commitState((prev) => ({
        ...prev,
        questions: [...prev.questions, ...questionsToAdd],
      }));
    },
    [db, commitState]
  );

  const createOrUpdateExam = useCallback(
    async (exam: Exam) => {
      if (!db || !currentUser) return;
      const nowIso = new Date().toISOString();
      await commitState((prev) => {
        const exists = prev.exams.some((e) => e.id === exam.id);
        return {
          ...prev,
          exams: exists ? prev.exams.map((e) => (e.id === exam.id ? exam : e)) : [exam, ...prev.exams],
          auditLogs: [
            {
              id: `aud-${Date.now()}`,
              timestamp: nowIso,
              actorId: currentUser.id,
              actorRole: currentUser.role,
              actorName: currentUser.name,
              action: exists ? 'EXAM_UPDATED' : 'EXAM_CREATED',
              targetType: 'exam',
              targetId: exam.id,
              summary: `${currentUser.name} ${exists ? 'updated' : 'created'} assessment "${exam.title}".`,
            },
            ...prev.auditLogs,
          ],
        };
      });
      pushToast('success', `Saved assessment "${exam.title}".`);
    },
    [db, currentUser, commitState, pushToast]
  );

  const startDemoExamNow = useCallback(
    async (examId: string, durationMinutes?: number) => {
      const currentDb = dbRef.current;
      if (!currentDb || !currentUser) return;
      const target = currentDb.exams.find((e) => e.id === examId);
      if (!target) {
        pushToast('error', 'Exam not found.');
        return;
      }
      const duration =
        durationMinutes ??
        target.durationMinutes ??
        Math.max(15, Math.round((Date.parse(target.endAt) - Date.parse(target.startAt)) / 60000) || 45);
      const win = computeDemoExamWindow(Date.now(), duration);
      const nowIso = new Date().toISOString();

      await commitState((prev) => ({
        ...prev,
        exams: prev.exams.map((ex) =>
          ex.id === examId
            ? {
                ...ex,
                startAt: win.startAt,
                endAt: win.endAt,
                durationMinutes: win.durationMinutes,
                isPublishedToStudents: true,
                isInteractiveSandbox: true,
                isDemoExam: true,
                semesterCalendarRef: 'sandbox',
                isDemoSlotLabel: `Demo exam active now (${win.durationMinutes} min · independent of official BZU calendar)`,
              }
            : ex
        ),
        notifications: [
          {
            id: `notif-demo-${Date.now()}`,
            recipientId: 'all-students',
            roleScope: 'student',
            title: `Demo Exam Started Now: ${target.title}`,
            message: `${target.title} is now live for ${win.durationMinutes} minutes under Available Demo Exams.`,
            createdAt: nowIso,
            read: false,
            linkTo: `/student/exams/${target.id}/instructions`,
          },
          ...prev.notifications,
        ],
        auditLogs: [
          {
            id: `aud-${Date.now()}`,
            timestamp: nowIso,
            actorId: currentUser.id,
            actorRole: currentUser.role,
            actorName: currentUser.name,
            action: 'DEMO_EXAM_STARTED_NOW',
            targetType: 'exam',
            targetId: target.id,
            summary: `${currentUser.name} started demo exam "${target.title}" immediately (${win.durationMinutes} min window, official schedule unchanged).`,
          },
          ...prev.auditLogs,
        ],
      }));
      setDemoModeActive(true);
      saveDemoModeActive(true);
      pushToast('success', `"${target.title}" is now LIVE for enrolled demo students (${win.durationMinutes} min).`);
    },
    [db, currentUser, commitState, pushToast]
  );

  const saveSubmissionAnnotations = useCallback(
    async (submissionId: string, annotations: PdfAnnotationStroke[]) => {
      if (!db) return;
      await commitState((prev) => ({
        ...prev,
        submissions: prev.submissions.map((s) =>
          s.id === submissionId ? { ...s, annotations } : s
        ),
      }));
      pushToast('success', 'PDF overlay annotations saved in local browser storage.');
    },
    [db, commitState, pushToast]
  );

  const saveMarkingProgressDraft = useCallback(
    async (submissionId: string, subjectiveScores: Record<string, number>, remarks: string) => {
      if (!db || !currentUser) return;
      const target = db.submissions.find((s) => s.id === submissionId);
      if (!target || target.initialMarksSaved || target.resultPublished) {
        pushToast('error', 'Initial marks are already finalized or published.');
        return;
      }
      const nowIso = new Date().toISOString();
      await commitState((prev) => ({
        ...prev,
        submissions: prev.submissions.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                subjectiveQuestionScores: { ...subjectiveScores },
                teacherRemarks: remarks,
                markingDraftSavedAt: nowIso,
              }
            : s
        ),
      }));
      pushToast('info', 'Marking progress draft saved locally (initial marks not finalized yet).');
    },
    [db, currentUser, commitState, pushToast]
  );

  const saveInitialSubmissionMarks = useCallback(
    async (submissionId: string, subjectiveScores: Record<string, number>, remarks: string) => {
      if (!db || !currentUser) return;
      const target = db.submissions.find((s) => s.id === submissionId);
      if (!target || target.initialMarksSaved || target.resultPublished) {
        pushToast('error', 'Initial marks are already saved or published. Request an Admin revision instead.');
        return;
      }
      const nowIso = new Date().toISOString();
      await commitState((prev) => ({
        ...prev,
        submissions: prev.submissions.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                subjectiveQuestionScores: { ...subjectiveScores },
                teacherRemarks: remarks,
                initialMarksSaved: true,
                initialMarksSavedAt: nowIso,
                initialMarksSavedBy: currentUser.id,
              }
            : s
        ),
        auditLogs: [
          {
            id: `aud-${Date.now()}`,
            timestamp: nowIso,
            actorId: currentUser.id,
            actorRole: currentUser.role,
            actorName: currentUser.name,
            action: 'INITIAL_MARKS_SAVED',
            targetType: 'submission',
            targetId: submissionId,
            summary: `${currentUser.name} saved initial marks for submission ${submissionId}.`,
          },
          ...prev.auditLogs,
        ],
      }));
      pushToast('success', 'Initial marks finalized. Subsequent pre-publication edits require Admin approval.');
    },
    [db, currentUser, commitState, pushToast]
  );

  const requestMarksRevision = useCallback(
    async (params: {
      submissionId: string;
      proposedScores: Record<string, number>;
      proposedRemarks: string;
      justification: string;
    }) => {
      if (!db || !currentUser) return;
      const sub = db.submissions.find((s) => s.id === params.submissionId);
      const exam = sub ? db.exams.find((e) => e.id === sub.examId) : undefined;
      if (!sub || !exam) return;
      if (sub.resultPublished) {
        pushToast('error', 'Published results are locked against teacher marks revisions.');
        return;
      }
      const oldTotal = Object.values(sub.subjectiveQuestionScores).reduce((a, b) => a + b, 0);
      const newTotal = Object.values(params.proposedScores).reduce((a, b) => a + b, 0);
      const nowIso = new Date().toISOString();
      const revId = `REV-2026-${String(db.revisionRequests.length + 1).padStart(3, '0')}`;

      const req: MarksRevisionRequest = {
        id: revId,
        submissionId: sub.id,
        examId: exam.id,
        courseId: exam.courseId,
        studentId: sub.studentId,
        teacherId: currentUser.id,
        oldSubjectiveTotal: oldTotal,
        proposedSubjectiveTotal: newTotal,
        proposedQuestionScores: { ...params.proposedScores },
        oldRemarks: sub.teacherRemarks ?? '',
        proposedRemarks: params.proposedRemarks,
        justification: params.justification,
        status: 'pending',
        requestedAt: nowIso,
      };

      await commitState((prev) => ({
        ...prev,
        revisionRequests: [req, ...prev.revisionRequests],
        notifications: [
          {
            id: `notif-${Date.now()}`,
            recipientId: 'admin-001',
            roleScope: 'admin',
            title: `New Revision Request: ${revId}`,
            message: `${currentUser.name} requested marks change (${oldTotal} → ${newTotal}) for ${exam.title}.`,
            createdAt: nowIso,
            read: false,
            linkTo: '/admin/revisions',
          },
          ...prev.notifications,
        ],
        auditLogs: [
          {
            id: `aud-${Date.now()}`,
            timestamp: nowIso,
            actorId: currentUser.id,
            actorRole: currentUser.role,
            actorName: currentUser.name,
            action: 'REVISION_REQUESTED',
            targetType: 'revision',
            targetId: revId,
            summary: `${currentUser.name} requested pre-publication revision ${revId} (${oldTotal} -> ${newTotal}). Result publication held.`,
          },
          ...prev.auditLogs,
        ],
      }));
      pushToast('warning', `Revision ${revId} submitted to Admin. Result publication is held until resolved.`);
    },
    [db, currentUser, commitState, pushToast]
  );

  const publishSubmissionResults = useCallback(
    async (submissionIds: string[]): Promise<{ publishedCount: number; heldCount: number }> => {
      const cur = dbRef.current;
      if (!cur || !currentUser) return { publishedCount: 0, heldCount: 0 };
      const nowIso = new Date().toISOString();
      let publishedCount = 0;
      let heldCount = 0;
      const newNotifs: UniversityDatabaseState['notifications'] = [];

      const updatedSubs = cur.submissions.map((sub) => {
        if (!submissionIds.includes(sub.id) || sub.resultPublished || !sub.isFinalized) return sub;
        const hasPending = cur.revisionRequests.some(
          (r) => r.submissionId === sub.id && r.status === 'pending'
        );
        if (hasPending) {
          heldCount++;
          return sub;
        }
        publishedCount++;
        const exam = cur.exams.find((e) => e.id === sub.examId);
        newNotifs.push({
          id: `notif-pub-${Date.now()}-${sub.studentId}`,
          recipientId: sub.studentId,
          roleScope: 'student',
          title: `Result Published: ${exam?.title ?? 'Assessment'}`,
          message: 'Combined MCQ + subjective marks and teacher feedback are now available.',
          createdAt: nowIso,
          read: false,
          linkTo: '/student/results',
        });
        return {
          ...sub,
          resultPublished: true,
          resultPublishedAt: nowIso,
        };
      });

      await commitState((prev) => ({
        ...prev,
        submissions: updatedSubs,
        notifications: [...newNotifs, ...prev.notifications],
        auditLogs:
          publishedCount > 0
            ? [
                {
                  id: `aud-${Date.now()}`,
                  timestamp: nowIso,
                  actorId: currentUser.id,
                  actorRole: currentUser.role,
                  actorName: currentUser.name,
                  action: 'RESULTS_PUBLISHED',
                  targetType: 'submission',
                  targetId: submissionIds.join(','),
                  summary: `${currentUser.name} published ${publishedCount} result(s). ${heldCount} held due to pending revisions.`,
                },
                ...prev.auditLogs,
              ]
            : prev.auditLogs,
      }));

      if (publishedCount > 0 && heldCount === 0) {
        pushToast('success', `Published ${publishedCount} result(s) to students.`);
      } else if (heldCount > 0) {
        pushToast('warning', `Published ${publishedCount}; ${heldCount} held pending Admin revision approval.`);
      }
      return { publishedCount, heldCount };
    },
    [currentUser, commitState, pushToast]
  );

  const publishExamResultsNow = useCallback(
    async (examId: string): Promise<{ publishedCount: number; reason?: string }> => {
      const cur = dbRef.current;
      if (!cur || !currentUser) return { publishedCount: 0, reason: 'Session not ready.' };
      const gate = canPublishExamResultsNow(examId, cur.submissions, cur.revisionRequests);
      if (!gate.allowed) {
        pushToast('warning', gate.reason ?? 'Exam results are not ready for publication.');
        return { publishedCount: 0, reason: gate.reason };
      }
      const targetIds = cur.submissions
        .filter((s) => s.examId === examId && s.isFinalized && !s.resultPublished)
        .map((s) => s.id);
      const res = await publishSubmissionResults(targetIds);
      return { publishedCount: res.publishedCount };
    },
    [db, currentUser, publishSubmissionResults, pushToast]
  );

  const gradeAssignmentSubmission = useCallback(
    async (submissionId: string, marks: number, feedback: string) => {
      if (!db) return;
      await commitState((prev) => ({
        ...prev,
        assignmentSubmissions: prev.assignmentSubmissions.map((s) =>
          s.id === submissionId
            ? { ...s, marksObtained: marks, teacherFeedback: feedback, status: 'Graded' }
            : s
        ),
      }));
      pushToast('success', 'Assignment marks saved.');
    },
    [db, commitState, pushToast]
  );

  const resolveMarksRevision = useCallback(
    async (revisionId: string, decision: 'approved' | 'rejected', decisionNote: string) => {
      if (!db || !currentUser || currentUser.role !== 'admin') return;
      const rev = db.revisionRequests.find((r) => r.id === revisionId);
      if (!rev || rev.status !== 'pending') return;
      const sub = db.submissions.find((s) => s.id === rev.submissionId);
      if (!sub) return;
      const nowIso = new Date().toISOString();

      const { updatedSubmission, updatedRevision } = resolveRevisionDecision(
        sub,
        rev,
        decision,
        currentUser.id,
        decisionNote,
        nowIso
      );

      await commitState((prev) => ({
        ...prev,
        submissions: prev.submissions.map((s) => (s.id === sub.id ? updatedSubmission : s)),
        revisionRequests: prev.revisionRequests.map((r) =>
          r.id === revisionId ? updatedRevision : r
        ),
        notifications: [
          {
            id: `notif-rev-${Date.now()}`,
            recipientId: rev.teacherId,
            roleScope: 'teacher',
            title: `Revision ${rev.id} ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
            message: `Admin ${decision} your marks change (${rev.oldSubjectiveTotal} → ${rev.proposedSubjectiveTotal}). ${updatedRevision.decisionNote ?? ''}`,
            createdAt: nowIso,
            read: false,
            linkTo: '/teacher/revisions',
          },
          ...prev.notifications,
        ],
        auditLogs: [
          {
            id: `aud-${Date.now()}`,
            timestamp: nowIso,
            actorId: currentUser.id,
            actorRole: 'admin',
            actorName: currentUser.name,
            action: decision === 'approved' ? 'REVISION_APPROVED' : 'REVISION_REJECTED',
            targetType: 'revision',
            targetId: rev.id,
            summary: `${currentUser.name} ${decision} ${rev.id} (${rev.oldSubjectiveTotal} -> ${rev.proposedSubjectiveTotal}). Note: ${updatedRevision.decisionNote}`,
          },
          ...prev.auditLogs,
        ],
      }));
      pushToast('success', `Revision ${revisionId} ${decision}.`);
    },
    [db, currentUser, commitState, pushToast]
  );

  const rescheduleExamWindow = useCallback(
    async (examId: string, newStartAt: string, newEndAt: string, reason: string) => {
      if (!db || !currentUser) return;
      const exam = db.exams.find((e) => e.id === examId);
      if (!exam) return;
      const nowIso = new Date().toISOString();
      const entry = {
        id: `rs-${Date.now()}`,
        oldStartAt: exam.startAt,
        oldEndAt: exam.endAt,
        newStartAt,
        newEndAt,
        reason: reason.trim() || 'Administrative schedule adjustment',
        changedBy: currentUser.name,
        changedAt: nowIso,
      };
      await commitState((prev) => ({
        ...prev,
        exams: prev.exams.map((e) =>
          e.id === examId
            ? {
                ...e,
                startAt: newStartAt,
                endAt: newEndAt,
                rescheduleHistory: [entry, ...e.rescheduleHistory],
              }
            : e
        ),
        auditLogs: [
          {
            id: `aud-${Date.now()}`,
            timestamp: nowIso,
            actorId: currentUser.id,
            actorRole: currentUser.role,
            actorName: currentUser.name,
            action: 'EXAM_RESCHEDULED',
            targetType: 'exam',
            targetId: examId,
            summary: `${currentUser.name} rescheduled "${exam.title}". Reason: ${entry.reason}`,
          },
          ...prev.auditLogs,
        ],
      }));
      pushToast('success', `Updated exam window for "${exam.title}".`);
    },
    [db, currentUser, commitState, pushToast]
  );

  const updateCheckedPaperPolicy = useCallback(
    async (allowGlobal: boolean, perStudentOverrides?: Record<string, boolean>) => {
      if (!db || !currentUser || currentUser.role !== 'admin') return;
      const nowIso = new Date().toISOString();
      await commitState((prev) => ({
        ...prev,
        policy: {
          ...prev.policy,
          allowStudentCheckedPaperView: allowGlobal,
          perStudentCheckedPaperOverrides:
            perStudentOverrides ?? prev.policy.perStudentCheckedPaperOverrides,
        },
        auditLogs: [
          {
            id: `aud-${Date.now()}`,
            timestamp: nowIso,
            actorId: currentUser.id,
            actorRole: 'admin',
            actorName: currentUser.name,
            action: 'VISIBILITY_POLICY_UPDATED',
            targetType: 'policy',
            targetId: 'global_checked_paper_policy',
            summary: `Admin set global checked-paper visibility to ${allowGlobal ? 'ALLOWED' : 'HIDDEN'}.`,
          },
          ...prev.auditLogs,
        ],
      }));
      pushToast('success', `Checked-paper visibility policy set to ${allowGlobal ? 'Allowed' : 'Restricted'}.`);
    },
    [db, currentUser, commitState, pushToast]
  );

  const toggleAccountActive = useCallback(
    async (role: 'student' | 'teacher', userId: string, active: boolean) => {
      if (!db || !currentUser || currentUser.role !== 'admin') return;
      const nowIso = new Date().toISOString();
      await commitState((prev) => ({
        ...prev,
        students:
          role === 'student'
            ? prev.students.map((s) => (s.id === userId ? { ...s, active } : s))
            : prev.students,
        teachers:
          role === 'teacher'
            ? prev.teachers.map((t) => (t.id === userId ? { ...t, active } : t))
            : prev.teachers,
        auditLogs: [
          {
            id: `aud-${Date.now()}`,
            timestamp: nowIso,
            actorId: currentUser.id,
            actorRole: 'admin',
            actorName: currentUser.name,
            action: active ? 'ACCOUNT_ENABLED' : 'ACCOUNT_SUSPENDED',
            targetType: 'auth',
            targetId: userId,
            summary: `Admin set ${role} account ${userId} status to ${active ? 'Active' : 'Suspended'}.`,
          },
          ...prev.auditLogs,
        ],
      }));
      pushToast('info', `Demo account ${userId} is now ${active ? 'Active' : 'Suspended'}.`);
    },
    [db, currentUser, commitState, pushToast]
  );

  const markNotificationRead = useCallback(
    async (notifId: string) => {
      if (!db) return;
      await commitState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === notifId ? { ...n, read: true } : n
        ),
      }));
    },
    [db, commitState]
  );

  const resetDemoDataset = useCallback(async () => {
    setLoading(true);
    try {
      const fresh = await resetDatabaseToSeed();
      dbRef.current = fresh;
      setDb(fresh);
      setActiveExamAttemptId(null);
      if (currentUser) {
        const refreshedUser = findUserByIdAndRole(fresh, currentUser.id, currentUser.role);
        setCurrentUser(refreshedUser);
      }
      pushToast('success', 'Demo dataset reset to clean initial 500/25/1 seed state.');
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, pushToast]);

  return (
    <AppStateContext.Provider
      value={{
        db,
        loading,
        storageError,
        currentUser,
        activeExamAttemptId,
        setActiveExamAttemptId,
        toasts,
        pushToast,
        dismissToast,
        demoModeActive,
        launchDemoMode,
        exitDemoMode,
        loginWithCredentials,
        loginQuickDemoRole,
        logout,
        tourOpenForRole,
        replayTour,
        closeTour,
        startOrResumeExamAttempt,
        updateExamDraft,
        uploadPdfAsset,
        logExamIncident,
        finalizeExamAttempt,
        submitAssignmentResponse,
        saveQuestion,
        saveManyQuestions,
        createOrUpdateExam,
        startDemoExamNow,
        saveSubmissionAnnotations,
        saveMarkingProgressDraft,
        saveInitialSubmissionMarks,
        requestMarksRevision,
        publishSubmissionResults,
        publishExamResultsNow,
        gradeAssignmentSubmission,
        resolveMarksRevision,
        rescheduleExamWindow,
        updateCheckedPaperPolicy,
        toggleAccountActive,
        markNotificationRead,
        resetDemoDataset,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
