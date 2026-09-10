import React, { useState, useEffect } from 'react';
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
      <section className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#092557]/80 via-[#061A3A]/90 to-[#040F24] p-5 sm:p-6 border border-[#1B3F80]/50 shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_20px_rgba(41,169,255,0.08)] flex flex-col items-center text-center backdrop-blur-md">
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
        <div className="w-full flex flex-col items-center gap-4">
          {/* Live Countdown Digits — Thick, Solid 3D Digit Boxes matching Figma */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 font-['IBM_Plex_Sans_Arabic'] my-1">
            {/* Days (Right in RTL) */}
            <div className="flex flex-col items-center">
              <div className="w-[62px] h-[54px] sm:w-[68px] sm:h-[58px] bg-[#071938] rounded-xl border-2 border-[#1B3F80] shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <span className="text-[#E5B65C] text-2xl sm:text-3xl font-bold tabular-nums leading-none drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]">
                  {format2Digits(timeLeft.days)}
                </span>
              </div>
              <span className="text-xs font-bold text-[#8299B5] mt-1.5">أيام</span>
            </div>

            <span className="text-2xl font-bold text-[#E5B65C] -mt-6 animate-pulse">:</span>

            {/* Hours */}
            <div className="flex flex-col items-center">
              <div className="w-[62px] h-[54px] sm:w-[68px] sm:h-[58px] bg-[#071938] rounded-xl border-2 border-[#1B3F80] shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <span className="text-[#E5B65C] text-2xl sm:text-3xl font-bold tabular-nums leading-none drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]">
                  {format2Digits(timeLeft.hours)}
                </span>
              </div>
              <span className="text-xs font-bold text-[#8299B5] mt-1.5">ساعة</span>
            </div>

            <span className="text-2xl font-bold text-[#E5B65C] -mt-6 animate-pulse">:</span>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <div className="w-[62px] h-[54px] sm:w-[68px] sm:h-[58px] bg-[#071938] rounded-xl border-2 border-[#1B3F80] shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <span className="text-[#E5B65C] text-2xl sm:text-3xl font-bold tabular-nums leading-none drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]">
                  {format2Digits(timeLeft.minutes)}
                </span>
              </div>
              <span className="text-xs font-bold text-[#8299B5] mt-1.5">دقيقة</span>
            </div>

            <span className="text-2xl font-bold text-[#E5B65C] -mt-6 animate-pulse">:</span>

            {/* Seconds (Left in RTL) */}
            <div className="flex flex-col items-center">
              <div className="w-[62px] h-[54px] sm:w-[68px] sm:h-[58px] bg-[#071938] rounded-xl border-2 border-[#E5B65C]/50 shadow-[0_0_12px_rgba(229,182,92,0.2),inset_0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <span className="text-[#E5B65C] text-2xl sm:text-3xl font-bold tabular-nums leading-none drop-shadow-[0_0_10px_rgba(229,182,92,0.7)]">
                  {format2Digits(timeLeft.seconds)}
                </span>
              </div>
              <span className="text-xs font-bold text-[#8299B5] mt-1.5">ثانية</span>
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
    <section className="w-full relative overflow-hidden rounded-xl p-px bg-gradient-to-r from-yellow-800/70 via-[#E5B65C]/80 to-yellow-800/70 shadow-[0_4px_25px_rgba(229,182,92,0.12)] group">
      {/* Decorative animated shimmer beam sweeping across */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-xl">
        <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-white/8 to-transparent animate-shimmer" />
      </div>

      <div className="relative w-full p-6 sm:p-7 bg-[#061A3A]/90 backdrop-blur-md rounded-xl flex flex-col lg:flex-row items-center justify-between gap-6">
        
        {/* Right (Start in RTL): Trophy Badge + Title & Description */}
        <div className="flex items-center gap-4.5">
          {/* Trophy Golden Icon Badge */}
          <div className="w-12 h-12 rounded-full bg-[#E5B65C]/15 border border-[#E5B65C]/30 shadow-[0_0_12px_rgba(229,182,92,0.25)] flex items-center justify-center text-[#E5B65C] shrink-0 transition-transform duration-300 group-hover:scale-105">
            <svg width="24" height="24" viewBox="0 0 18 18" fill="none">
              <path
                d="M4 18V16H8V12.9C7.18333 12.7167 6.45417 12.3708 5.8125 11.8625C5.17083 11.3542 4.7 10.7167 4.4 9.95C3.15 9.8 2.10417 9.25417 1.2625 8.3125C0.420833 7.37083 0 6.26667 0 5V4C0 3.45 0.195833 2.97917 0.5875 2.5875C0.979167 2.19583 1.45 2 2 2H4V0H14V2H16C16.55 2 17.0208 2.19583 17.4125 2.5875C17.8042 2.97917 18 3.45 18 4V5C18 6.26667 17.5792 7.37083 16.7375 8.3125C15.8958 9.25417 14.85 9.8 13.6 9.95C13.3 10.7167 12.8292 11.3542 12.1875 11.8625C11.5458 12.3708 10.8167 12.7167 10 12.9V16H14V18H4ZM4 7.8V4H2V5C2 5.63333 2.18333 6.20417 2.55 6.7125C2.91667 7.22083 3.4 7.58333 4 7.8ZM14 7.8C14.6 7.58333 15.0833 7.22083 15.45 6.7125C15.8167 6.20417 16 5.63333 16 5V4H14V7.8Z"
                fill="#E5B65C"
              />
            </svg>
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
            <div className="flex flex-col items-center">
              <div className="min-w-[54px] h-[48px] px-2.5 bg-[#040F24] border-2 border-[#1B3F80] rounded-xl flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(0,0,0,0.5)]">
                <span className="text-[#E5B65C] text-xl font-bold tabular-nums leading-none">
                  {format2Digits(timeLeft.days)}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#8299B5] mt-1">أيام</span>
            </div>

            <span className="text-xl font-bold text-[#E5B65C] -mt-5 animate-pulse">:</span>

            {/* Hours */}
            <div className="flex flex-col items-center">
              <div className="min-w-[54px] h-[48px] px-2.5 bg-[#040F24] border-2 border-[#1B3F80] rounded-xl flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(0,0,0,0.5)]">
                <span className="text-[#E5B65C] text-xl font-bold tabular-nums leading-none">
                  {format2Digits(timeLeft.hours)}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#8299B5] mt-1">ساعة</span>
            </div>

            <span className="text-xl font-bold text-[#E5B65C] -mt-5 animate-pulse">:</span>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <div className="min-w-[54px] h-[48px] px-2.5 bg-[#040F24] border-2 border-[#1B3F80] rounded-xl flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(0,0,0,0.5)]">
                <span className="text-[#E5B65C] text-xl font-bold tabular-nums leading-none">
                  {format2Digits(timeLeft.minutes)}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#8299B5] mt-1">دقيقة</span>
            </div>

            <span className="text-xl font-bold text-[#E5B65C] -mt-5 animate-pulse">:</span>

            {/* Seconds */}
            <div className="flex flex-col items-center">
              <div className="min-w-[54px] h-[48px] px-2.5 bg-[#040F24] border-2 border-[#E5B65C]/60 rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(229,182,92,0.25),inset_0_1px_2px_rgba(0,0,0,0.5)]">
                <span className="text-[#E5B65C] text-xl font-bold tabular-nums leading-none drop-shadow-[0_0_6px_rgba(229,182,92,0.6)]">
                  {format2Digits(timeLeft.seconds)}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#8299B5] mt-1">ثانية</span>
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
