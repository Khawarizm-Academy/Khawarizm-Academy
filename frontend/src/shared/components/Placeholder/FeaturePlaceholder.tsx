import React from 'react';

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

/**
 * Reusable "under construction" page used by placeholder routes
 * (events, competitions, dashboard, profile) so no tab ever renders blank.
 */
export const FeaturePlaceholder: React.FC<FeaturePlaceholderProps> = ({
  title,
  description,
  icon,
}) => {
  return (
    <main className="content-container">
      <div className="w-full py-20 px-6 flex-col-center text-center gap-5 animate-fade-in-up">
        <div className="w-20 h-20 rounded-2xl bg-[#092557] border border-[#1B3F80] flex-center text-[#E5B65C] shadow-lg">
          {icon ?? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-['IBM_Plex_Sans_Arabic'] tracking-tight">
          {title}
        </h1>
        <p className="max-w-xl text-slate-400 text-sm sm:text-base font-['Tajawal'] leading-relaxed">
          {description}
        </p>
        <span className="mt-4 px-4 py-1.5 rounded-full bg-[#061A3A] border border-[#E5B65C]/50 text-[#E5B65C] text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold">
          قيد الإعداد — قريبًا
        </span>
      </div>
    </main>
  );
};