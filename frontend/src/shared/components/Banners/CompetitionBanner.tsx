import React from 'react';
import type { Competition } from '../../types/entities';

interface CompetitionBannerProps {
  competition: Competition;
  variant?: 'desktop' | 'mobile';
  onRegister?: () => void;
}

export const CompetitionBanner: React.FC<CompetitionBannerProps> = ({
  competition,
  variant = 'desktop',
  onRegister,
}) => {
  if (variant === 'mobile') {
    return (
      <section className="w-full relative overflow-hidden rounded-xl bg-gradient-to-b from-[#061A3A] via-[#092557] to-[#061A3A] p-6 border border-[#E5B65C]/30 shadow-[0_0_25px_rgba(229,182,92,0.15)] flex flex-col items-center text-center">
        {/* Subtle decorative background shimmer */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#E5B65C]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top Badge */}
        <div className="mb-3 px-3 py-1 rounded-full bg-[#E5B65C]/20 border border-[#E5B65C]/40 text-[#E5B65C] text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold backdrop-blur-xs">
          {competition.badge}
        </div>

        {/* Title */}
        <h3 className="text-2xl sm:text-3xl font-bold text-[#DCE5EE] mb-4 font-['IBM_Plex_Sans_Arabic']">
          {competition.title}
        </h3>

        {/* Countdown Digits (Mirrored for RTL) */}
        <div className="flex items-center gap-3 mb-6 font-['IBM_Plex_Sans_Arabic']">
          {/* Days */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-12 rounded-lg bg-[#040F24] border border-[#1B3F80] shadow-inner flex items-center justify-center text-[#E5B65C] text-2xl font-bold tabular-nums">
              {competition.daysRemaining}
            </div>
            <span className="text-[11px] text-[#8299B5] font-bold mt-1">أيام</span>
          </div>

          <span className="text-2xl font-bold text-[#DCE5EE] -mt-4">:</span>

          {/* Hours */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-12 rounded-lg bg-[#040F24] border border-[#1B3F80] shadow-inner flex items-center justify-center text-[#E5B65C] text-2xl font-bold tabular-nums">
              {competition.hoursRemaining}
            </div>
            <span className="text-[11px] text-[#8299B5] font-bold mt-1">ساعة</span>
          </div>
        </div>

        {/* Primary CTA Button */}
        <button
          onClick={onRegister}
          className="w-full py-3 rounded-full bg-gradient-to-r from-[#C88A32] to-[#E5B65C] hover:from-[#E5B65C] hover:to-[#C88A32] text-[#040F24] font-bold text-base font-['Tajawal'] shadow-[0_0_16px_rgba(229,182,92,0.40)] hover:shadow-[0_0_24px_rgba(229,182,92,0.60)] transition-all cursor-pointer"
        >
          {competition.actionText}
        </button>
      </section>
    );
  }

  // Desktop Variant
  return (
    <section className="w-full relative overflow-hidden rounded-xl p-[1px] bg-gradient-to-r from-[#C88A32] via-[#E5B65C] to-[#C88A32] shadow-[0_0_25px_rgba(229,182,92,0.18)]">
      <div className="w-full p-8 bg-[#061A3A]/95 backdrop-blur-sm rounded-xl flex items-center justify-between">
        
        {/* Right (Start in RTL): Trophy + Title & Hook */}
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[#E5B65C]/20 border border-[#E5B65C]/40 flex items-center justify-center text-[#E5B65C] shrink-0 shadow-[0_0_12px_rgba(229,182,92,0.3)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>

          <div>
            <h3 className="text-xl font-bold text-[#E5B65C] font-['IBM_Plex_Sans_Arabic'] mb-1">
              {competition.title}
            </h3>
            <p className="text-sm text-[#8299B5] font-['Tajawal']">
              {competition.description}
            </p>
          </div>
        </div>

        {/* Left (End in RTL): Gold CTA Button */}
        <button
          onClick={onRegister}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-[#C88A32] to-[#E5B65C] hover:from-[#E5B65C] hover:to-[#C88A32] text-[#040F24] font-semibold text-sm font-['IBM_Plex_Sans_Arabic'] shadow-[0_0_14px_rgba(229,182,92,0.40)] hover:shadow-[0_0_20px_rgba(229,182,92,0.60)] transition-all hover:scale-105 cursor-pointer shrink-0"
        >
          {competition.actionText}
        </button>

      </div>
    </section>
  );
};
