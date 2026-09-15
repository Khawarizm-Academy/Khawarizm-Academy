import React from 'react';
import { useNavigate } from '../../../app/routerContext';
import { RadialProgressRing } from './RadialProgressRing';

interface EnrolledCourseRowProps {
  id: string;
  title: string;
  category: string;
  progressPercent: number;
  iconType?: 'uiux' | 'python' | 'ai';
}

export const EnrolledCourseRow: React.FC<EnrolledCourseRowProps> = ({
  id,
  title,
  category,
  progressPercent,
  iconType = 'uiux',
}) => {
  const navigate = useNavigate();

  return (
    <div
      dir="rtl"
      data-layer="Course-Row"
      className="CourseRow self-stretch p-3.5 md:p-4 bg-blue-950 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center gap-3 md:gap-5 hover:border-sky-400/40 transition-all duration-200"
    >
      {/* Right side in RTL: Thumbnail + Course text info */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 text-right">
        {/* Course Thumbnail */}
        <div
          data-layer="Thumb-Large"
          className="size-11 md:size-14 rounded-xl bg-[#061A3A] border border-blue-900/80 flex items-center justify-center shrink-0 shadow-inner"
        >
          {iconType === 'uiux' && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="18" height="14" rx="2" stroke="#29A9FF" strokeWidth="2" />
              <path d="M7 8H17M7 12H13" stroke="#E5B65C" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          {iconType === 'python' && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2C8.5 2 6.5 3.5 6.5 5.5V8H13.5V9H4.5C2.5 9 1 10.5 1 14C1 17.5 2.5 19 6 19H8V16.5C8 14.5 10 13 12 13H15.5V12H20C21.5 12 23 10.5 23 8.5C23 6.5 21.5 5 18 5H16V7.5C16 9.5 14 11 12 11H8.5V2"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {iconType === 'ai' && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="7" stroke="#29A9FF" strokeWidth="2" />
              <circle cx="12" cy="12" r="3" fill="#E5B65C" />
              <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="#29A9FF" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>

        {/* Text Details */}
        <div data-layer="Text-Details" className="flex-1 flex flex-col justify-start items-start gap-1 min-w-0">
          <h3
            data-layer={title}
            title={title}
            className="text-slate-200 text-sm md:text-base font-bold font-['Tajawal'] leading-5 md:leading-6 truncate w-full text-right"
          >
            {title}
          </h3>
          <span
            data-layer={category}
            className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4 text-right"
          >
            {category}
          </span>
        </div>
      </div>

      {/* Left side in RTL: Progress Ring + "استمر" Action Button */}
      <div className="flex items-center gap-2.5 md:gap-4 shrink-0">
        {/* Radial Progress Ring */}
        <RadialProgressRing progress={progressPercent} size={44} strokeWidth={4} />

        {/* Action Button */}
        <button
          type="button"
          onClick={() => navigate(`/courses/${id}`)}
          data-layer="Action-Btn"
          className="ActionBtn px-4 md:px-5 py-2 md:py-2.5 bg-slate-900 hover:bg-slate-800 rounded-full outline outline-1 outline-offset-[-1px] outline-blue-900 hover:outline-orange-300 text-orange-300 text-xs md:text-sm font-bold font-['Tajawal'] transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
        >
          استمر
        </button>
      </div>
    </div>
  );
};
