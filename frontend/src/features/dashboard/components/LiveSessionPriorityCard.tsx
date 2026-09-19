import React from 'react';
import { Radio } from 'lucide-react';
import { useLiveCountdown } from '../hooks/useLiveCountdown';

interface LiveSessionPriorityCardProps {
  courseTitle?: string;
  instructorName?: string;
  sessionDescription?: string;
  initialMinutes?: number;
  initialSeconds?: number;
  onJoinSession?: () => void;
}

export const LiveSessionPriorityCard: React.FC<LiveSessionPriorityCardProps> = ({
  courseTitle = 'برمجة بايثون للمبتدئين',
  instructorName = 'م. خالد الشمري',
  sessionDescription = 'شاشة المباشرة والأسئلة تفاعلية',
  initialMinutes = 14,
  initialSeconds = 3,
  onJoinSession,
}) => {
  const totalSeconds = initialMinutes * 60 + initialSeconds;
  const { formattedTime } = useLiveCountdown(totalSeconds);

  return (
    <div
      dir="rtl"
      data-layer="Live-Priority-Card"
      className="LivePriorityCard self-stretch p-6 md:p-7 bg-slate-900 rounded-3xl shadow-[0px_8px_24px_0px_rgba(255,77,77,0.12)] outline outline-[1.5px] outline-offset-[-1.5px] outline-red-500/80 flex flex-col justify-start items-start gap-5 md:gap-6 relative overflow-hidden select-none"
    >
      {/* Red ambient beacon atmosphere */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Live-Tag */}
      <div
        data-layer="Live-Tag"
        className="LiveTag px-3 py-1.5 bg-red-500/10 rounded-lg inline-flex justify-start items-center gap-2 border border-red-500/20"
      >
        <span className="size-2 rounded-full bg-red-500 animate-ping shrink-0" />
        <span
          data-layer="جلستك المباشرة تبدأ قريبًا"
          className="text-red-500 text-xs font-bold font-['Tajawal'] leading-3"
        >
          جلستك المباشرة تبدأ قريبًا
        </span>
      </div>

      {/* Live-Details: Thumbnail on Right, Text Details on Left in RTL */}
      <div
        data-layer="Live-Details"
        className="LiveDetails self-stretch flex justify-start items-center gap-4 md:gap-6"
      >
        {/* 1. Thumbnail with beacon on the RIGHT */}
        <div
          data-layer="Thumb-Wrapper"
          className="ThumbWrapper size-16 md:size-20 bg-blue-950 rounded-2xl flex justify-center items-center overflow-hidden shrink-0 border border-red-500/30 shadow-inner group-hover:border-red-400 transition-colors"
        >
          <div className="relative flex items-center justify-center">
            <Radio size={36} className="text-red-400 drop-shadow-[0_0_8px_rgba(255,77,77,0.8)]" strokeWidth={1.8} />
            <span className="size-2 rounded-full bg-[#E5B65C] absolute" />
          </div>
        </div>

        {/* 2. Text Details on the LEFT */}
        <div data-layer="Text-Details" className="TextDetails flex-1 flex flex-col justify-start items-start gap-1.5 md:gap-2 text-right">
          <h2
            data-layer={courseTitle}
            className="text-slate-200 text-lg md:text-xl font-bold font-['Cairo'] leading-6 md:leading-7"
          >
            {courseTitle}
          </h2>
          <p
            data-layer={sessionDescription}
            className="text-slate-400 text-xs md:text-base font-medium font-['Tajawal'] leading-5 md:leading-6"
          >
            المعلم: {instructorName} • {sessionDescription}
          </p>
        </div>
      </div>

      {/* Countdown Chamber */}
      <div
        data-layer="Countdown-Chamber"
        className="w-full bg-slate-950/80 border border-blue-900/60 rounded-2xl py-4 px-6 flex flex-col items-center justify-center gap-1 shadow-inner"
      >
        <span
          data-layer="الوقت المتبقي لبدء الجلسة"
          className="text-slate-400 text-xs font-normal font-['Tajawal']"
        >
          الوقت المتبقي لبدء الجلسة
        </span>
        <div
          data-layer={formattedTime}
          className="text-3xl md:text-4xl font-extrabold text-slate-100 font-mono tracking-widest text-shadow-sm"
        >
          {formattedTime}
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={onJoinSession}
        data-layer="Hero-Action"
        className="self-stretch py-3.5 bg-gradient-to-r from-[#E5B65C] to-amber-400 hover:from-amber-400 hover:to-[#E5B65C] text-slate-900 font-bold font-['Tajawal'] text-base rounded-full flex justify-center items-center cursor-pointer shadow-[0_4px_16px_rgba(229,182,92,0.3)] hover:shadow-[0_4px_24px_rgba(229,182,92,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all"
      >
        <span className="hidden md:inline">انضم الآن للجلسة</span>
        <span className="md:hidden">انضم الآن</span>
      </button>
    </div>
  );
};
