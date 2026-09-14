import React from 'react';
import type { LiveSessionInfo } from '../types';
import { useLiveCountdown } from '../hooks/useLiveCountdown';

interface LiveSessionPriorityCardProps {
  session: LiveSessionInfo;
  onJoin?: () => void;
}

export const LiveSessionPriorityCard: React.FC<LiveSessionPriorityCardProps> = ({
  session,
  onJoin,
}) => {
  const { formattedTime, isStarted } = useLiveCountdown(session.initialRemainingSeconds);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0B1E40] to-[#061A3A] rounded-2xl border border-[#FF4D4D]/50 shadow-[0_0_30px_rgba(255,77,77,0.18)] p-5 sm:p-7 flex flex-col gap-6 transition-all duration-300">
      {/* Ambient Red Celestial Glow in Background */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF4D4D]/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header Urgency Beacon */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#FF4D4D]/10 border border-[#FF4D4D]/30 text-[#FF6B6B] text-xs font-bold font-['Tajawal']">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D4D] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF4D4D]" />
          </span>
          <span>جلستك المباشرة تبدأ قريبًا</span>
        </div>

        <span className="text-xs text-[#8299B5] font-['Tajawal'] hidden sm:inline">
          منصة الفصول الافتراضية
        </span>
      </div>

      {/* 2. Course Details & Instructor Info */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 flex flex-col gap-1.5">
          <h2 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] font-['Cairo',sans-serif] leading-tight">
            {session.courseTitle}
          </h2>
          <p className="text-sm text-[#8299B5] font-['Tajawal',sans-serif] leading-relaxed">
            {session.instructor}
          </p>
        </div>

        {/* Course Thumbnail */}
        <div className="size-16 sm:size-20 rounded-2xl overflow-hidden shrink-0 border border-[#167BDB]/40 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
          <img
            src={session.thumbnail}
            alt={session.courseTitle}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>

      {/* 3. High-Tech Inset Countdown Chamber */}
      <div className="w-full p-4 sm:p-5 rounded-2xl bg-[#040F24]/90 border border-[#1B3F80]/70 shadow-inner flex flex-col items-center justify-center gap-1">
        <span className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
          {isStarted ? 'بدأت الجلسة الآن!' : 'الوقت المتبقي لبدء الجلسة'}
        </span>
        <div
          className="text-4xl sm:text-5xl font-black font-['Cairo',sans-serif] text-[#F1F5F9] tracking-wider drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]"
          dir="ltr"
        >
          {formattedTime}
        </div>
      </div>

      {/* 4. Primary Gold Action CTA */}
      <button
        onClick={onJoin}
        className="btn-gold w-full py-3.5 sm:py-4 text-base font-bold font-['Cairo',sans-serif] shadow-[0_0_20px_rgba(229,182,92,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" opacity="0.2" />
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span>انضم الآن للجلسة</span>
      </button>
    </section>
  );
};
