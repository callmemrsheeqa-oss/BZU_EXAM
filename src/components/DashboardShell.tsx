import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  BookOpen,
  FileText,
  ClipboardCheck,
  Award,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Monitor,
  HelpCircle,
  Users,
  Building2,
  GitPullRequest,
  ShieldCheck,
  Database,
  PenSquare,
  FolderKanban,
  Send,
  TrendingUp,
  Info,
  AlertCircle,
  Rocket,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { useTheme } from '../context/ThemeContext';
import { BzuExamPlatformLogo, UniversityLogoPlaceholder } from './BrandLogos';
import { GuidedTourModal } from './GuidedTourModal';
import type { UserRole } from '../types/domain';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getNavItems(role: UserRole): NavItem[] {
  if (role === 'student') {
    return [
      { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/demo-control', label: 'Demo Control Panel', icon: Rocket },
      { to: '/student/exams', label: 'Exams', icon: FileText },
      { to: '/student/assignments', label: 'Assignments', icon: ClipboardCheck },
      { to: '/student/submissions', label: 'My Submissions', icon: FolderKanban },
      { to: '/student/results', label: 'Results', icon: Award },
      { to: '/student/courses', label: 'Courses', icon: BookOpen },
      { to: '/student/progress', label: 'Academic Progress', icon: TrendingUp },
      { to: '/student/profile', label: 'My Profile', icon: User },
      { to: '/calendar', label: 'Academic Calendar', icon: CalendarDays },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/settings', label: 'Settings', icon: Settings },
    ];
  }
  if (role === 'teacher') {
    return [
      { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/demo-control', label: 'Demo Control Panel', icon: Rocket },
      { to: '/teacher/courses', label: 'My Courses', icon: BookOpen },
      { to: '/teacher/students', label: 'Enrolled Students', icon: Users },
      { to: '/teacher/exam-builder', label: 'Exam Builder', icon: PenSquare },
      { to: '/teacher/question-bank', label: 'Question Bank', icon: FolderKanban },
      { to: '/teacher/schedule', label: 'Exam Schedule', icon: CalendarDays },
      { to: '/teacher/submissions', label: 'Demo Exam Submissions', icon: ClipboardCheck },
      { to: '/teacher/gradebook', label: 'Gradebook', icon: Award },
      { to: '/teacher/revisions', label: 'Revision Requests', icon: GitPullRequest },
      { to: '/teacher/publish', label: 'Results Publisher', icon: Send },
      { to: '/calendar', label: 'BZU Calendar', icon: CalendarDays },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/settings', label: 'Settings', icon: Settings },
    ];
  }
  return [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/demo-control', label: 'Demo Control Panel', icon: Rocket },
    { to: '/admin/accounts', label: 'Accounts (500/25/1)', icon: Users },
    { to: '/admin/departments', label: 'Departments & Courses', icon: Building2 },
    { to: '/admin/calendar-control', label: 'Schedule & Reschedule', icon: CalendarDays },
    { to: '/admin/revisions', label: 'Revision Queue', icon: GitPullRequest },
    { to: '/admin/policies', label: 'Result & Paper Policy', icon: ShieldCheck },
    { to: '/admin/incidents', label: 'Incidents & Audit Logs', icon: FileText },
    { to: '/admin/dataset', label: 'Demo Dataset & Reset', icon: Database },
    { to: '/calendar', label: 'Official Calendar', icon: CalendarDays },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];
}

export const DashboardShell: React.FC<{
  title: string;
  breadcrumb?: string;
  children: React.ReactNode;
}> = ({ title, breadcrumb, children }) => {
  const {
    currentUser,
    db,
    demoModeActive,
    launchDemoMode,
    logout,
    loginQuickDemoRole,
    activeExamAttemptId,
    replayTour,
    toasts,
    dismissToast,
  } = useAppState();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!currentUser) return null;

  const navItems = getNavItems(currentUser.role);
  const unreadCount =
    db?.notifications.filter(
      (n) => !n.read && (n.recipientId === currentUser.id || n.roleScope === currentUser.role)
    ).length ?? 0;

  const handleRoleSwitch = (role: UserRole) => {
    if (activeExamAttemptId) return;
    loginQuickDemoRole(role);
    navigate(`/${role}/dashboard`);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Collapsible Left Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 shrink-0 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
        aria-label="Primary navigation"
      >
        <div className="flex items-center justify-between gap-2 px-4 h-16 border-b border-slate-200 dark:border-slate-800">
          <Link to={`/${currentUser.role}/dashboard`} className="min-w-0">
            <BzuExamPlatformLogo compact={sidebarCollapsed} />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <UniversityLogoPlaceholder size="sm" />
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                {!sidebarCollapsed && item.to === '/notifications' && unreadCount > 0 && (
                  <span className="ml-auto font-mono text-xs font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2">
          <Link
            to="/about"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Info className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Prototype & Storage Guide</span>}
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 z-10">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800">
              <BzuExamPlatformLogo />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2">
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                <Info className="h-4 w-4" />
                Prototype & Storage Guide
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean Top Bar (3 zones) */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {breadcrumb ?? `BZU Exam · ${currentUser.role.toUpperCase()} DEMO`}
              </div>
              <h1 className="font-display text-base lg:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Theme Selector */}
            <div
              className="hidden sm:inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5"
              role="group"
              aria-label="Theme selection"
            >
              {(
                [
                  { id: 'auto', label: 'Auto', icon: Monitor },
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPreference(t.id)}
                    aria-label={`Set theme to ${t.label}`}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      preference === t.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={replayTour}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Replay Tour</span>
            </button>

            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: currentUser.avatarColor }}
                aria-hidden="true"
              >
                {currentUser.avatarInitials}
              </div>
              <div className="hidden md:block leading-tight">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 max-w-[150px] truncate">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {currentUser.email}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Demo Mode Toolbar + Role Switcher (below header fold) */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/50 px-4 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {demoModeActive ? 'Interactive Demo Mode Active · ' : ''}
              Unofficial Prototype · Local Browser IndexedDB
            </span>
            <Link
              to="/demo-control"
              onClick={() => {
                if (!demoModeActive) launchDemoMode();
              }}
              className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 whitespace-nowrap"
            >
              <Rocket className="h-3 w-3" />
              {demoModeActive ? 'Demo Control Panel' : 'Launch Demo Mode'}
            </Link>
            <Link
              to="/about"
              className="font-semibold text-emerald-700 dark:text-emerald-400 underline-offset-2 hover:underline whitespace-nowrap"
            >
              Demo Guide
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 mr-1">Switch Demo Role:</span>
            {(['student', 'teacher', 'admin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                disabled={Boolean(activeExamAttemptId)}
                onClick={() => handleRoleSwitch(r)}
                title={
                  activeExamAttemptId
                    ? 'Role switching is locked during an active exam attempt'
                    : `Switch to ${r} demo`
                }
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                  currentUser.role === r
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Main Viewport */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-xs font-medium shadow-lg ${
                t.kind === 'error'
                  ? 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100'
                  : t.kind === 'warning'
                    ? 'border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100'
                    : t.kind === 'success'
                      ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
              }`}
            >
              <span>{t.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notification"
                className="opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <GuidedTourModal />
    </div>
  );
};
