import React from 'react';
import { Trophy } from 'lucide-react';
import type { Competition } from '../../types/entities';
import { useCountdown } from '../../hooks/useCountdown';
import { CountdownDigits } from './CountdownDigits';

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
  // Live real-time countdown shared with the dashboard challenge spotlight
  const timeLeft = useCountdown({
    days: parseInt(competition.daysRemaining, 10) || 3,
    hours: parseInt(competition.hoursRemaining, 10) || 14,
    minutes: 36,
    seconds: 48,
  });

  // Mobile Variant matching media_1788955065979.png with timer directly unified with registration button
  if (variant === 'mobile') {
    return (
      <section className="banner-mobile-card">
        {/* Subtle decorative background shimmer */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#E5B65C]/8 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badge (مسابقة برمجية) */}
        <div className="mb-2.5 px-3 py-0.5 rounded-full bg-[#E5B65C]/15 border border-[#E5B65C]/30 text-[#E5B65C] text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold backdrop-blur-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E5B65C] animate-ping" />
          <span>{competition.badge}</span>
        </div>

        {/* Title */}
        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 font-['IBM_Plex_Sans_Arabic'] tracking-tight">
          {competition.title}
        </h3>

        {/* Action & Timer Unit — Placed right above & tightly coupled with registration button */}
        <div className="w-full flex-col-center gap-4">
          {/* Live Countdown Digits — Thick, Solid 3D Digit Boxes matching Figma */}
          <CountdownDigits value={timeLeft} variant="mobile" />

          {/* Primary CTA Button (سجل الآن) */}
          <button
            onClick={onRegister}
            className="btn-gold w-full py-3.5 text-base rounded-xl"
          >
            {competition.actionText}
          </button>
        </div>
      </section>
    );
  }

  // Desktop Variant: Timer placed right next to the "سجل الآن" button
  return (
    <section className="banner-frame-gold">
      {/* Decorative animated shimmer beam sweeping across */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-xl">
        <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-white/8 to-transparent animate-shimmer" />
      </div>

      <div className="banner-inner-glass">
        
        {/* Right (Start in RTL): Trophy Badge + Title & Description */}
        <div className="flex items-center gap-4.5">
          {/* Trophy Golden Icon Badge */}
          <div className="w-12 h-12 rounded-full bg-[#E5B65C]/15 border border-[#E5B65C]/30 shadow-[0_0_12px_rgba(229,182,92,0.25)] flex items-center justify-center text-[#E5B65C] shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Trophy size={24} />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-[#E5B65C] font-['IBM_Plex_Sans_Arabic'] leading-7 mb-1">
              {competition.title}
            </h3>
            <p className="text-sm sm:text-base text-[#8299B5] font-['Tajawal'] leading-relaxed">
              {competition.description}
            </p>
          </div>
        </div>

        {/* Left (End in RTL): Integrated Action Cluster — Timer Placed Directly Beside the "سجل الآن" Button */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Live Countdown Timer Unit — Thick Substantial Digit Cards */}
          <CountdownDigits value={timeLeft} variant="desktop" />

          {/* Button "سجل الآن" */}
          <button
            onClick={onRegister}
            className="btn-gold px-7 py-3 text-sm sm:text-base shrink-0 whitespace-nowrap"
          >
            {competition.actionText}
          </button>
        </div>

      </div>
    </section>
  );
};
