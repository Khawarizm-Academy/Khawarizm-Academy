import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
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
  // Live Real-Time Countdown Engine
  const [timeLeft, setTimeLeft] = useState({
    days: parseInt(competition.daysRemaining, 10) || 3,
    hours: parseInt(competition.hoursRemaining, 10) || 14,
    minutes: 36,
    seconds: 48,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const format2Digits = (num: number) => num.toString().padStart(2, '0');

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
          <div className="flex-center gap-2 sm:gap-3 font-['IBM_Plex_Sans_Arabic'] my-1">
            {/* Days (Right in RTL) */}
            <div className="flex-col-center">
              <div className="digit-box-mobile">
                <span className="digit-text text-2xl sm:text-3xl drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]">
                  {format2Digits(timeLeft.days)}
                </span>
              </div>
              <span className="digit-label text-xs mt-1.5">أيام</span>
            </div>

            <span className="text-2xl font-bold text-[#E5B65C] -mt-6 animate-pulse">:</span>

            {/* Hours */}
            <div className="flex-col-center">
              <div className="digit-box-mobile">
                <span className="digit-text text-2xl sm:text-3xl drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]">
                  {format2Digits(timeLeft.hours)}
                </span>
              </div>
              <span className="digit-label text-xs mt-1.5">ساعة</span>
            </div>

            <span className="text-2xl font-bold text-[#E5B65C] -mt-6 animate-pulse">:</span>

            {/* Minutes */}
            <div className="flex-col-center">
              <div className="digit-box-mobile">
                <span className="digit-text text-2xl sm:text-3xl drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]">
                  {format2Digits(timeLeft.minutes)}
                </span>
              </div>
              <span className="digit-label text-xs mt-1.5">دقيقة</span>
            </div>

            <span className="text-2xl font-bold text-[#E5B65C] -mt-6 animate-pulse">:</span>

            {/* Seconds (Left in RTL) */}
            <div className="flex-col-center">
              <div className="digit-box-mobile-active">
                <span className="digit-text text-2xl sm:text-3xl drop-shadow-[0_0_10px_rgba(229,182,92,0.7)]">
                  {format2Digits(timeLeft.seconds)}
                </span>
              </div>
              <span className="digit-label text-xs mt-1.5">ثانية</span>
            </div>
          </div>

          {/* Primary CTA Button (سجل الآن) */}
          <button
            onClick={onRegister}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E5B65C] to-[#F3CE7A] hover:brightness-110 active:scale-[0.99] text-[#040F24] font-bold text-base font-['IBM_Plex_Sans_Arabic'] shadow-[0_0_16px_rgba(229,182,92,0.35)] hover:shadow-[0_0_24px_rgba(229,182,92,0.55)] transition-all cursor-pointer"
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
          <div className="flex items-center gap-2 sm:gap-2.5 font-['IBM_Plex_Sans_Arabic']">
            {/* Days */}
            <div className="flex-col-center">
              <div className="digit-box min-w-[54px] h-[48px] px-2.5">
                <span className="digit-text text-xl">
                  {format2Digits(timeLeft.days)}
                </span>
              </div>
              <span className="digit-label text-[11px] mt-1">أيام</span>
            </div>

            <span className="text-xl font-bold text-[#E5B65C] -mt-5 animate-pulse">:</span>

            {/* Hours */}
            <div className="flex-col-center">
              <div className="digit-box min-w-[54px] h-[48px] px-2.5">
                <span className="digit-text text-xl">
                  {format2Digits(timeLeft.hours)}
                </span>
              </div>
              <span className="digit-label text-[11px] mt-1">ساعة</span>
            </div>

            <span className="text-xl font-bold text-[#E5B65C] -mt-5 animate-pulse">:</span>

            {/* Minutes */}
            <div className="flex-col-center">
              <div className="digit-box min-w-[54px] h-[48px] px-2.5">
                <span className="digit-text text-xl">
                  {format2Digits(timeLeft.minutes)}
                </span>
              </div>
              <span className="digit-label text-[11px] mt-1">دقيقة</span>
            </div>

            <span className="text-xl font-bold text-[#E5B65C] -mt-5 animate-pulse">:</span>

            {/* Seconds */}
            <div className="flex-col-center">
              <div className="digit-box-active min-w-[54px] h-[48px] px-2.5">
                <span className="digit-text text-xl drop-shadow-[0_0_6px_rgba(229,182,92,0.6)]">
                  {format2Digits(timeLeft.seconds)}
                </span>
              </div>
              <span className="digit-label text-[11px] mt-1">ثانية</span>
            </div>
          </div>

          {/* Button "سجل الآن" */}
          <button
            onClick={onRegister}
            className="px-7 py-3 rounded-full bg-gradient-to-r from-[#E5B65C] to-[#F3CE7A] hover:brightness-110 active:scale-95 text-[#040F24] font-bold text-sm sm:text-base font-['IBM_Plex_Sans_Arabic'] shadow-[0_4px_16px_rgba(229,182,92,0.35)] hover:shadow-[0_6px_24px_rgba(229,182,92,0.55)] transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            {competition.actionText}
          </button>
        </div>

      </div>
    </section>
  );
};
