import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Lock,
  Eye,
  FileCheck2,
} from 'lucide-react';

export type SemanticTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'locked';

export const StatusLabel: React.FC<{
  tone: SemanticTone;
  label: string;
}> = ({ tone, label }) => {
  const styles: Record<SemanticTone, string> = {
    success: 'text-emerald-700 dark:text-emerald-400',
    warning: 'text-amber-700 dark:text-amber-400',
    danger: 'text-red-700 dark:text-red-400',
    info: 'text-sky-700 dark:text-sky-400',
    neutral: 'text-slate-600 dark:text-slate-400',
    locked: 'text-slate-700 dark:text-slate-300',
  };

  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning'
        ? AlertTriangle
        : tone === 'danger'
          ? XCircle
          : tone === 'info'
            ? Eye
            : tone === 'locked'
              ? Lock
              : Clock;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${styles[tone]}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

export function examStatusTone(status: string): SemanticTone {
  switch (status) {
    case 'Available':
    case 'Result Published':
    case 'Graded':
    case 'approved':
      return 'success';
    case 'In Progress':
    case 'Submitted':
    case 'Open':
      return 'info';
    case 'Under Review':
    case 'pending':
      return 'warning';
    case 'Closed':
    case 'rejected':
      return 'danger';
    default:
      return 'neutral';
  }
}

export { FileCheck2 };
