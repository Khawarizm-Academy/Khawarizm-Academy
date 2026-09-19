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
      data-layer="Hero-Course-Card"
      className="HeroCourseCard self-stretch p-6 md:p-7 bg-slate-900 rounded-3xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-sky-400 flex flex-col justify-start items-start gap-5 md:gap-6 relative overflow-hidden select-none"
    >
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero-Tag */}
      <div
        data-layer="Hero-Tag"
        className="HeroTag px-3 py-1.5 bg-sky-400/10 rounded-lg inline-flex justify-start items-start border border-sky-400/20"
      >
        <span
          data-layer={tagLabel}
          className="text-sky-400 text-xs font-medium font-['Tajawal'] leading-4"
        >
          {tagLabel}
        </span>
      </div>

      {/* Hero-Card-Main: Thumbnail on Right, Title/Info on Left in RTL */}
      <div
        data-layer="Hero-Card-Main"
        className="HeroCardMain self-stretch flex justify-start items-center gap-4 md:gap-6"
      >
        {/* 1. Thumbnail Frame on the RIGHT */}
        <div
          data-layer="Thumb-Wrapper"
          className="ThumbWrapper size-16 md:size-20 bg-blue-950 rounded-2xl flex justify-center items-center overflow-hidden shrink-0 border border-blue-900 shadow-inner group-hover:border-sky-400 transition-colors"
        >
          <div className="relative flex items-center justify-center">
            <Brain size={36} className="text-sky-400 drop-shadow-[0_0_10px_rgba(41,169,255,0.8)]" strokeWidth={1.8} />
            <span className="size-2 rounded-full bg-[#E5B65C] absolute" />
          </div>
        </div>

        {/* 2. Hero-Text on the LEFT of Thumbnail */}
        <div data-layer="Hero-Text" className="HeroText flex-1 flex flex-col justify-start items-start gap-1.5 md:gap-2 text-right">
          <h2
            data-layer={courseTitle}
            className="text-slate-200 text-lg md:text-xl font-bold font-['Cairo'] leading-6 md:leading-7"
          >
            {courseTitle}
          </h2>
          <p
            data-layer={courseTrack}
            className="text-slate-400 text-xs md:text-sm font-medium font-['Tajawal'] leading-5"
          >
            {courseTrack}
          </p>
        </div>
      </div>

      {/* Progress-Bar-Container */}
      <div
        data-layer="Progress-Bar-Container"
        className="ProgressBarContainer self-stretch flex flex-col justify-start items-start gap-2.5 md:gap-3"
      >
        <div
          data-layer="Progress-Metadata"
          className="ProgressMetadata self-stretch flex justify-between items-center text-xs md:text-sm"
        >
          {/* Right in RTL */}
          <span
            data-layer="الدرس 4 من 10 دروس"
            className="text-slate-400 font-medium font-['Tajawal']"
          >
            الدرس {currentLesson} من {totalLessons} دروس
          </span>

          {/* Left in RTL */}
          <span
            data-layer="40% مكتمل"
            className="text-sky-400 font-bold font-['Tajawal']"
          >
            {completionPercentage}% مكتمل
          </span>
        </div>

        {/* Progress Track & Fill */}
        <div
          data-layer="Progress-Track"
          className="ProgressTrack self-stretch h-2.5 bg-blue-950/80 rounded-full overflow-hidden border border-blue-900/60"
        >
          <div
            data-layer="Progress-Fill"
            style={{ width: `${completionPercentage}%` }}
            className="ProgressFill h-full bg-gradient-to-l from-sky-400 to-blue-600 rounded-full shadow-[0_0_8px_rgba(41,169,255,0.6)] transition-all duration-700"
          />
        </div>
      </div>

      {/* Hero-Action Button */}
      <button
        type="button"
        onClick={onContinue}
        data-layer="Hero-Action"
        className="HeroAction self-stretch py-3.5 bg-gradient-to-r from-[#E5B65C] to-amber-400 hover:from-amber-400 hover:to-[#E5B65C] text-slate-900 font-bold font-['Tajawal'] text-base rounded-full flex justify-center items-center cursor-pointer shadow-[0_4px_16px_rgba(229,182,92,0.25)] hover:shadow-[0_4px_24px_rgba(229,182,92,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all"
      >
        استمر في التعلم
      </button>
    </div>
  );
};
