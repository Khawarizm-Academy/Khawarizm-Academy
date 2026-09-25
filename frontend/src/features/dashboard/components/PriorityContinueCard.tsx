import React from 'react';
import { Brain } from 'lucide-react';

interface PriorityContinueCardProps {
  courseId?: string;
  courseTitle?: string;
  courseTrack?: string;
  currentLesson?: number;
  totalLessons?: number;
  completionPercentage?: number;
  tagLabel?: string;
  onContinue?: () => void;
}

export const PriorityContinueCard: React.FC<PriorityContinueCardProps> = ({
  courseTitle = 'أساسيات الذكاء الاصطناعي وتعلم الآلة',
  courseTrack = 'المستوى المتوسط • 8 أسابيع • بإشراف نخبة من المختصين',
  currentLesson = 4,
  totalLessons = 10,
  completionPercentage = 40,
  tagLabel = 'موصى به لليوم',
  onContinue,
}) => {
  return (
    <div
      dir="rtl"

      className="self-stretch p-6 md:p-7 bg-slate-900 rounded-3xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-sky-400 flex flex-col justify-start items-start gap-5 md:gap-6 relative overflow-hidden select-none"
    >
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero-Tag */}
      <div

        className="px-3 py-1.5 bg-sky-400/10 rounded-lg inline-flex justify-start items-start border border-sky-400/20"
      >
        <span

          className="text-sky-400 text-xs font-medium font-['Tajawal'] leading-4"
        >
          {tagLabel}
        </span>
      </div>

      {/* Hero-Card-Main: Thumbnail on Right, Title/Info on Left in RTL */}
      <div

        className="self-stretch flex justify-start items-center gap-4 md:gap-6"
      >
        {/* 1. Thumbnail Frame on the RIGHT */}
        <div

          className="size-16 md:size-20 bg-blue-950 rounded-2xl flex justify-center items-center overflow-hidden shrink-0 border border-blue-900 shadow-inner group-hover:border-sky-400 transition-colors"
        >
          <div className="relative flex items-center justify-center">
            <Brain size={36} className="text-sky-400 drop-shadow-[0_0_10px_rgba(41,169,255,0.8)]" strokeWidth={1.8} />
            <span className="size-2 rounded-full bg-[#E5B65C] absolute" />
          </div>
        </div>

        {/* 2. Hero-Text on the LEFT of Thumbnail */}
        <div className="flex-1 flex flex-col justify-start items-start gap-1.5 md:gap-2 text-right">
          <h2

            className="text-slate-200 text-lg md:text-xl font-bold font-['IBM_Plex_Sans_Arabic'] leading-6 md:leading-7"
          >
            {courseTitle}
          </h2>
          <p

            className="text-slate-400 text-xs md:text-sm font-medium font-['Tajawal'] leading-5"
          >
            {courseTrack}
          </p>
        </div>
      </div>

      {/* Progress-Bar-Container */}
      <div

        className="self-stretch flex flex-col justify-start items-start gap-2.5 md:gap-3"
      >
        <div

          className="self-stretch flex justify-between items-center text-xs md:text-sm"
        >
          {/* Right in RTL */}
          <span

            className="text-slate-400 font-medium font-['Tajawal']"
          >
            الدرس {currentLesson} من {totalLessons} دروس
          </span>

          {/* Left in RTL */}
          <span

            className="text-sky-400 font-bold font-['Tajawal']"
          >
            {completionPercentage}% مكتمل
          </span>
        </div>

        {/* Progress Track & Fill */}
        <div

          className="self-stretch h-2.5 bg-blue-950/80 rounded-full overflow-hidden border border-blue-900/60"
        >
          <div

            style={{ width: `${completionPercentage}%` }}
            className="h-full bg-gradient-to-l from-sky-400 to-blue-600 rounded-full shadow-[0_0_8px_rgba(41,169,255,0.6)] transition-all duration-700"
          />
        </div>
      </div>

      {/* Hero-Action Button */}
      <button
        type="button"
        onClick={onContinue}

        className="btn-gold self-stretch py-3.5 text-base rounded-full"
      >
        استمر في التعلم
      </button>
    </div>
  );
};
