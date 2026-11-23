import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Moon, Sun, Monitor, HelpCircle, RefreshCw } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { useTheme } from '../context/ThemeContext';
import { DashboardShell } from '../components/DashboardShell';
import { formatKarachiDateTime } from '../lib/examTimer';

export const NotificationsPage: React.FC = () => {
  const { db, currentUser, markNotificationRead } = useAppState();
  if (!db || !currentUser) return null;

  const list = db.notifications.filter(
    (n) => n.recipientId === currentUser.id || n.roleScope === currentUser.role || n.roleScope === 'all'
  );

  return (
    <DashboardShell title="Notifications" breadcrumb="Inbox · Local Demo Alerts">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No notifications yet for this demo account.
          </div>
        ) : (
          list.map((n) => (
            <div key={n.id} className="p-4 flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Bell className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span>{n.title}</span>
                  {!n.read && (
                    <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
                      · Unread
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                <div className="text-[11px] font-mono text-slate-400">
                  {formatKarachiDateTime(n.createdAt)} (Asia/Karachi)
                </div>
              </div>
              <div className="flex items-center gap-2">
                {n.linkTo && (
                  <Link
                    to={n.linkTo}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Open
                  </Link>
                )}
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  );
};

export const SettingsPage: React.FC = () => {
  const { currentUser, replayTour, resetDemoDataset } = useAppState();
  const { preference, setPreference } = useTheme();
  const [confirming, setConfirming] = useState(false);

  if (!currentUser) return null;

  return (
    <DashboardShell title="Settings & Preferences" breadcrumb="Browser Preferences · Local Demo">
      <div className="max-w-2xl space-y-6">
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Appearance Theme (Saved Per Browser)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Auto tracks your device prefers-color-scheme setting dynamically.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: 'auto', label: 'Auto (System)', icon: Monitor },
                { id: 'light', label: 'Light Mode', icon: Sun },
                { id: 'dark', label: 'Dark Mode', icon: Moon },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreference(opt.id)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-xs font-semibold transition-colors ${
                    preference === opt.id
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Guided Role Tour
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Replay the interactive walkthrough for your current role ({currentUser.role.toUpperCase()}).
          </p>
          <button
            type="button"
            onClick={replayTour}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <HelpCircle className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            Replay Role Tour
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Reset Local IndexedDB Demo Data
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Restore initial deterministic 500 students, 25 teachers, 1 admin, and sample papers.
          </p>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-300"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Demo Dataset
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  await resetDemoDataset();
                  setConfirming(false);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
};
