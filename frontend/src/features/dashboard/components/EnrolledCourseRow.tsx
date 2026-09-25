import React from 'react';
import { Palette, Code2, Brain } from 'lucide-react';
import { RadialProgressRing } from './RadialProgressRing';

interface EnrolledCourseRowProps {
  id: string;
  title: string;
  category: string;
  progressPercent: number;
  iconType?: 'uiux' | 'python' | 'ai';
  onContinue?: (id: string) => void;
}

export const EnrolledCourseRow: React.FC<EnrolledCourseRowProps> = ({
  id,
  title,
  category,
  progressPercent,
  iconType = 'uiux',
  onContinue,
}) => {
  return (
    <div
      dir="rtl"

      className="CourseRow self-stretch p-3.5 md:p-4 bg-blue-950 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center gap-3 md:gap-5 hover:border-sky-400/40 transition-all duration-200 select-none"
    >
      {/* Right side in RTL: Thumbnail + Course text info */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 text-right">
        {/* Course Thumbnail */}
        <div

          className="size-11 md:size-14 rounded-xl bg-[#061A3A] border border-blue-900/80 flex items-center justify-center shrink-0 shadow-inner"
        >
          {iconType === 'uiux' && (
            <Palette size={22} className="text-sky-400" strokeWidth={1.8} />
          )}
          {iconType === 'python' && (
            <Code2 size={22} className="text-emerald-400" strokeWidth={1.8} />
          )}
          {iconType === 'ai' && (
            <Brain size={22} className="text-sky-400" strokeWidth={1.8} />
          )}
        </div>

        {/* Text Details */}
        <div className="flex-1 flex flex-col justify-start items-start gap-1 min-w-0">
          <h3

            title={title}
            className="text-slate-200 text-sm md:text-base font-bold font-['Tajawal'] leading-5 md:leading-6 truncate w-full text-right"
          >
            {title}
          </h3>
          <span

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
          onClick={() => onContinue ? onContinue(id) : undefined}

          className="ActionBtn px-4 md:px-5 py-2 md:py-2.5 bg-slate-900 hover:bg-slate-800 rounded-full outline outline-1 outline-offset-[-1px] outline-blue-900 hover:outline-[#E5B65C] text-[#E5B65C] text-xs md:text-sm font-bold font-['Tajawal'] transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
        >
          استمر
        </button>
      </div>
    </div>
  );
};
