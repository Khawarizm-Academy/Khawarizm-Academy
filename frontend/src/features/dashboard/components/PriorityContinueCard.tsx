import React from 'react';
import { useNavigate } from '../../../app/routerContext';

interface PriorityContinueCardProps {
  courseId?: string;
  courseTitle?: string;
  courseTrack?: string;
  currentLesson?: number;
  totalLessons?: number;
  completionPercentage?: number;
  tagLabel?: string;
}

export const PriorityContinueCard: React.FC<PriorityContinueCardProps> = ({
  courseId = 'course-ai-101',
  courseTitle = 'أساسيات الذكاء الاصطناعي وتعلم الآلة',
  courseTrack = 'المستوى المتوسط • 8 أسابيع • بإشراف نخبة من المختصين',
  currentLesson = 4,
  totalLessons = 10,
  completionPercentage = 40,
  tagLabel = 'موصى به لليوم',
}) => {
  const navigate = useNavigate();

  return (
    <div
      dir="rtl"
      data-layer="Hero-Course-Card"
      className="HeroCourseCard self-stretch p-6 md:p-7 bg-slate-900 rounded-3xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-sky-400 flex flex-col justify-start items-start gap-5 md:gap-6 relative overflow-hidden"
    >
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero-Tag */}
      <div
        data-layer="Hero-Tag"
        className="HeroTag px-3 py-1.5 bg-sky-400/10 rounded-lg inline-flex justify-start items-start"
      >
        <span
          data-layer={tagLabel}
          className="text-sky-400 text-xs font-medium font-['Tajawal'] leading-4"
        >
          {tagLabel}
        </span>
      </div>

      {/* Hero-Card-Main: Title/Info on right, Thumbnail on left in RTL */}
      <div
        data-layer="Hero-Card-Main"
        className="HeroCardMain self-stretch flex justify-between items-center gap-4 md:gap-6"
      >
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

        {/* Thumbnail Frame */}
        <div
          data-layer="Thumb-Wrapper"
          className="ThumbWrapper size-16 md:size-20 bg-blue-950 rounded-2xl flex justify-center items-center overflow-hidden shrink-0 border border-blue-900 shadow-inner"
        >
          {/* Cyan glowing AI neural brain SVG icon */}
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M15 10C12.24 10 10 12.24 10 15C10 16.14 10.39 17.19 11.04 18.03C10.4 18.87 10 19.89 10 21C10 22.38 10.62 23.62 11.6 24.45C11.22 25.22 11 26.09 11 27C11 29.76 13.24 32 16 32C17.38 32 18.62 31.44 19.5 30.54V9.46C18.62 8.56 17.38 8 16 8C15.66 8 15.32 8.04 15 8.11V10ZM25 10C27.76 10 30 12.24 30 15C30 16.14 29.61 17.19 28.96 18.03C29.6 18.87 30 19.89 30 21C30 22.38 29.38 23.62 28.4 24.45C28.78 25.22 29 26.09 29 27C29 29.76 26.76 32 24 32C22.62 32 21.38 31.44 20.5 30.54V9.46C21.38 8.56 22.62 8 24 8C24.34 8 24.68 8.04 25 8.11V10Z"
              stroke="#29A9FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="20" cy="20" r="2" fill="#E5B65C" />
          </svg>
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
          <span
            data-layer="الدرس 4 من 10 دروس"
            className="text-slate-400 font-medium font-['Tajawal']"
          >
            الدرس {currentLesson} من {totalLessons} دروس
          </span>
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
        onClick={() => navigate(`/courses/${courseId}`)}
        data-layer="Hero-Action"
        className="HeroAction self-stretch py-3.5 bg-gradient-to-r from-orange-300 to-amber-400 hover:from-amber-400 hover:to-orange-300 text-slate-900 font-bold font-['Tajawal'] text-base rounded-full flex justify-center items-center cursor-pointer shadow-[0_4px_16px_rgba(229,182,92,0.25)] hover:shadow-[0_4px_24px_rgba(229,182,92,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all"
      >
        استمر في التعلم
      </button>
    </div>
  );
};
