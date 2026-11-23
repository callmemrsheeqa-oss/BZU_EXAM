import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Moon,
  Sun,
  Monitor,
  CalendarDays,
  BookOpen,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Rocket,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { useTheme } from '../context/ThemeContext';
import { BzuExamPlatformLogo, UniversityLogoPlaceholder } from '../components/BrandLogos';
import { SpiderCursorCanvas } from '../components/SpiderCursorCanvas';

export const LoginPage: React.FC = () => {
  const { db, loading, loginWithCredentials, loginQuickDemoRole, launchDemoMode } = useAppState();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('student001@bzu.edu.pk');
  const [password, setPassword] = useState('BzuDemo#Stu001');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCredSheet, setShowCredSheet] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = loginWithCredentials(email, password);
    if (!res.ok || !res.user) {
      setErrorMsg(res.error ?? 'Authentication failed.');
      return;
    }
    navigate(`/${res.user.role}/dashboard`);
  };

  const handleQuickDemo = (role: 'student' | 'teacher' | 'admin') => {
    loginQuickDemoRole(role);
    navigate(`/${role}/dashboard`);
  };

  const sampleAccounts = db
    ? [
        ...db.students.slice(0, 3).map((s) => ({
          role: 'Student',
          name: s.name,
          email: s.email,
          password: s.password,
          note: `${s.rollNumber} · CASPAM`,
        })),
        ...db.teachers.slice(0, 2).map((t) => ({
          role: 'Teacher',
          name: t.name,
          email: t.email,
          password: t.password,
          note: `${t.assignedCourseIds.length} course(s)`,
        })),
        ...db.admins.map((a) => ({
          role: 'Admin',
          name: a.name,
          email: a.email,
          password: a.password,
          note: 'Controller Demo',
        })),
      ]
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Clean 3-Zone Top Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 flex items-center justify-between gap-8">
        <BzuExamPlatformLogo />

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link to="/calendar" className="hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0">
            Academic Calendar
          </Link>
          <Link to="/about" className="hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0">
            Prototype Guide
          </Link>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5"
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
                  aria-label={`Theme ${t.label}`}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                    preference === t.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Split Desktop Layout: LEFT = Functional Sign-in Panel, RIGHT = Spider Cursor Particle-Web */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT Sign-In Panel */}
        <section
          className="lg:col-span-5 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14 bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800"
          aria-label="Demo Sign In"
        >
          <div className="max-w-md w-full mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <UniversityLogoPlaceholder size="md" />
            </div>

            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Sign in to BZU Exam
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Unofficial academic examination prototype for Bahauddin Zakariya University, Multan. All accounts, grades, and papers are synthetic demo records stored locally in this browser.
              </p>
            </div>

            {/* Launch Demo Mode + Quick Demo Shortcuts */}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  launchDemoMode('teacher');
                  navigate('/demo-control');
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-400/70 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 px-4 py-2.5 text-xs font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
              >
                <Rocket className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Launch Demo Mode (Full Examination Lifecycle Control Panel)
              </button>

              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                One-Click Role Shortcuts
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemo('student')}
                  className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                >
                  Try Student Demo
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemo('teacher')}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Try Teacher Demo
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemo('admin')}
                  className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-3 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
                >
                  Try Admin Demo
                </button>
              </div>
            </div>

            {/* Email + Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Demo University Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student001@bzu.edu.pk"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Demo Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 pr-10 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3.5 py-2.5 text-xs text-red-800 dark:text-red-300"
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                {loading ? 'Loading Demo Dataset...' : 'Sign In with Email & Password'}
              </button>
            </form>

            {/* Demo Credential Sheet Drawer */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <button
                type="button"
                onClick={() => setShowCredSheet((s) => !s)}
                aria-expanded={showCredSheet}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="inline-flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Developer Demo Credential Sheet (500 Students · 25 Teachers · 1 Admin)
                </span>
                {showCredSheet ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showCredSheet && (
                <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2 max-h-60 overflow-y-auto">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click any row to fill the login form. Client-side role checks and demo passwords are for prototype demonstration only.
                  </p>
                  {sampleAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => {
                        setEmail(acc.email);
                        setPassword(acc.password);
                        setErrorMsg(null);
                      }}
                      className="w-full text-left rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 hover:border-emerald-500 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
                        <span>{acc.role}: {acc.name}</span>
                        <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">{acc.password}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {acc.email} · {acc.note}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span>Roll number alone cannot sign in. Email + deterministic password is required.</span>
            </div>
          </div>
        </section>

        {/* RIGHT Area: Prominent Spider Cursor Particle-Web Animation */}
        <section
          className="lg:col-span-7 relative overflow-hidden bg-slate-100 dark:bg-slate-950 min-h-[340px] lg:min-h-full flex flex-col justify-between p-8 lg:p-14"
          aria-label="Interactive prototype overview"
        >
          <SpiderCursorCanvas />

          <div className="relative z-10 max-w-xl space-y-4 pointer-events-none">
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Interactive Browser-Only Academic Assessment Prototype
            </div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              End-to-End University Examinations, PDF Checking & Marks Governance
            </h2>
            <p className="text-sm lg:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Move your cursor across this canvas to interact with the geometric web. Explore the complete cross-role workflow locally in one browser: Student timed attempts, Teacher on-site PDF annotations & revision requests, and Controller approval gates.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm p-4">
              <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                500 / 25 / 1
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Seeded synthetic students, faculty & controller accounts in IndexedDB
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm p-4">
              <div className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                Acad/AC-26/7021
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Official BZU Fall 2026, Spring 2027 & Summer 2027 calendar windows
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm p-4">
              <div className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                100% Zero-Budget
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Pure React + PDF.js + Mammoth + jsPDF static SPA with zero paid APIs
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
