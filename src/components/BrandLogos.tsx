import React from 'react';

/**
 * Original modern platform logo for "BZU Exam" (prototype platform emblem)
 * paired with a clearly labeled Official University Logo Placeholder slot.
 * Never fabricates an official university seal.
 */
export const BzuExamPlatformLogo: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="32"
        height="32"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="36" height="36" rx="9" fill="#0B6E4F" />
        <path
          d="M10 11.5C10 10.6716 10.6716 10 11.5 10H20.5C23.5376 10 26 12.4624 26 15.5C26 17.1636 25.2614 18.6548 24.0942 19.6626C25.5529 20.6296 26.5 22.2889 26.5 24.1667C26.5 27.1122 24.1122 29.5 21.1667 29.5H11.5C10.6716 29.5 10 28.8284 10 28V11.5Z"
          stroke="#F8FAFC"
          strokeWidth="2.2"
        />
        <path d="M14.5 15.5H20M14.5 20H19.5M14.5 24.5H21" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
          BZU Exam
        </span>
      )}
    </div>
  );
};

export const UniversityLogoPlaceholder: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 ${
        size === 'sm' ? 'px-2.5 py-1.5' : 'px-3 py-2'
      }`}
      title="Replaceable slot for authorized Bahauddin Zakariya University logo (public/assets/bzu-official-logo.png)"
    >
      <div
        className={`flex items-center justify-center rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 ${
          size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
        }`}
        aria-hidden="true"
      >
        UNI
      </div>
      <div className="leading-tight text-left">
        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
          BZU Logo Placeholder
        </div>
        {size === 'md' && (
          <div className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Unofficial Demo · Insert Authorized Asset
          </div>
        )}
      </div>
    </div>
  );
};
