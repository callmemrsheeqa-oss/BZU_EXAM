import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { canAccessRoleRoute } from './lib/permissions';
import type { UserRole } from './types/domain';

import { LoginPage } from './pages/LoginPage';
import { AcademicCalendarPage } from './pages/AcademicCalendarPage';
import { AboutPrototypePage } from './pages/AboutPrototypePage';
import { NotificationsPage, SettingsPage } from './pages/SettingsAndNotificationsPage';
import { DemoControlPanelPage } from './components/DemoControlPanel';

import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import {
  StudentExamAttemptPage,
  StudentExamInstructionsPage,
  StudentExamsListPage,
} from './pages/student/StudentExamsPages';
import {
  StudentAssignmentsPage,
  StudentCoursesAndProgressPage,
  StudentProfilePage,
  StudentResultsPage,
  StudentSubmissionsPage,
} from './pages/student/StudentAcademicPages';

import {
  TeacherCoursesPage,
  TeacherDashboardPage,
  TeacherSchedulePage,
  TeacherStudentsPage,
} from './pages/teacher/TeacherDashboardAndRosterPages';
import {
  TeacherExamBuilderPage,
  TeacherQuestionBankPage,
} from './pages/teacher/TeacherAuthoringPages';
import {
  TeacherGradebookPage,
  TeacherResultPublisherPage,
  TeacherRevisionRequestsPage,
  TeacherSubmissionsCheckerPage,
} from './pages/teacher/TeacherGradingAndRevisionPages';

import {
  AdminAccountsPage,
  AdminDashboardPage,
  AdminDepartmentsCoursesPage,
} from './pages/admin/AdminDashboardAndDirectoryPages';
import {
  AdminDatasetResetPage,
  AdminIncidentsAuditPage,
  AdminPoliciesPage,
  AdminRevisionQueuePage,
  AdminScheduleReschedulePage,
} from './pages/admin/AdminGovernancePages';

const RequireRole: React.FC<{ role: UserRole; children: React.ReactNode }> = ({ role, children }) => {
  const { currentUser, loading } = useAppState();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-500">
        Initializing local IndexedDB demo state...
      </div>
    );
  }
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!canAccessRoleRoute(currentUser, role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 text-center">
          <h1 className="font-display text-lg font-bold text-red-700 dark:text-red-400">
            Role Access Restricted (Client-Only Demo Guard)
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            You are signed in as <strong>{currentUser.role.toUpperCase()}</strong>. This route belongs to <strong>{role.toUpperCase()}</strong>. Client-side role checks are for prototype demonstration only.
          </p>
          <Link
            to={`/${currentUser.role}/dashboard`}
            className="inline-block rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white"
          >
            Return to My Dashboard
          </Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAppState();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-500">
        Initializing local IndexedDB demo state...
      </div>
    );
  }
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { currentUser, loading } = useAppState();
  const search = typeof window !== 'undefined' ? window.location.search : '';
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-500">
        Loading BZU Exam prototype...
      </div>
    );
  }
  if (currentUser) {
    return <Navigate to={`/${currentUser.role}/dashboard${search}`} replace />;
  }
  return <Navigate to={`/login${search}`} replace />;
};

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
    <div className="max-w-md space-y-3">
      <div className="font-mono text-3xl font-bold text-emerald-700 dark:text-emerald-400">404</div>
      <h1 className="font-display text-xl font-bold">Page Not Found</h1>
      <p className="text-xs text-slate-500">The requested BZU Exam prototype route does not exist.</p>
      <Link to="/" className="inline-block rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">
        Return Home
      </Link>
    </div>
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <AppStateProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/calendar" element={<AcademicCalendarPage />} />
            <Route path="/about" element={<AboutPrototypePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/demo-control" element={<RequireAuth><DemoControlPanelPage /></RequireAuth>} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={<RequireRole role="student"><StudentDashboardPage /></RequireRole>} />
            <Route path="/student/profile" element={<RequireRole role="student"><StudentProfilePage /></RequireRole>} />
            <Route path="/student/courses" element={<RequireRole role="student"><StudentCoursesAndProgressPage mode="courses" /></RequireRole>} />
            <Route path="/student/progress" element={<RequireRole role="student"><StudentCoursesAndProgressPage mode="progress" /></RequireRole>} />
            <Route path="/student/exams" element={<RequireRole role="student"><StudentExamsListPage /></RequireRole>} />
            <Route path="/student/exams/:examId/instructions" element={<RequireRole role="student"><StudentExamInstructionsPage /></RequireRole>} />
            <Route path="/student/exams/:examId/attempt" element={<RequireRole role="student"><StudentExamAttemptPage /></RequireRole>} />
            <Route path="/student/submissions" element={<RequireRole role="student"><StudentSubmissionsPage /></RequireRole>} />
            <Route path="/student/assignments" element={<RequireRole role="student"><StudentAssignmentsPage /></RequireRole>} />
            <Route path="/student/results" element={<RequireRole role="student"><StudentResultsPage /></RequireRole>} />

            {/* Teacher Routes */}
            <Route path="/teacher/dashboard" element={<RequireRole role="teacher"><TeacherDashboardPage /></RequireRole>} />
            <Route path="/teacher/courses" element={<RequireRole role="teacher"><TeacherCoursesPage /></RequireRole>} />
            <Route path="/teacher/students" element={<RequireRole role="teacher"><TeacherStudentsPage /></RequireRole>} />
            <Route path="/teacher/exam-builder" element={<RequireRole role="teacher"><TeacherExamBuilderPage /></RequireRole>} />
            <Route path="/teacher/question-bank" element={<RequireRole role="teacher"><TeacherQuestionBankPage /></RequireRole>} />
            <Route path="/teacher/schedule" element={<RequireRole role="teacher"><TeacherSchedulePage /></RequireRole>} />
            <Route path="/teacher/submissions" element={<RequireRole role="teacher"><TeacherSubmissionsCheckerPage /></RequireRole>} />
            <Route path="/teacher/gradebook" element={<RequireRole role="teacher"><TeacherGradebookPage /></RequireRole>} />
            <Route path="/teacher/revisions" element={<RequireRole role="teacher"><TeacherRevisionRequestsPage /></RequireRole>} />
            <Route path="/teacher/publish" element={<RequireRole role="teacher"><TeacherResultPublisherPage /></RequireRole>} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<RequireRole role="admin"><AdminDashboardPage /></RequireRole>} />
            <Route path="/admin/accounts" element={<RequireRole role="admin"><AdminAccountsPage /></RequireRole>} />
            <Route path="/admin/departments" element={<RequireRole role="admin"><AdminDepartmentsCoursesPage /></RequireRole>} />
            <Route path="/admin/calendar-control" element={<RequireRole role="admin"><AdminScheduleReschedulePage /></RequireRole>} />
            <Route path="/admin/revisions" element={<RequireRole role="admin"><AdminRevisionQueuePage /></RequireRole>} />
            <Route path="/admin/policies" element={<RequireRole role="admin"><AdminPoliciesPage /></RequireRole>} />
            <Route path="/admin/incidents" element={<RequireRole role="admin"><AdminIncidentsAuditPage /></RequireRole>} />
            <Route path="/admin/dataset" element={<RequireRole role="admin"><AdminDatasetResetPage /></RequireRole>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AppStateProvider>
    </ThemeProvider>
  );
}
