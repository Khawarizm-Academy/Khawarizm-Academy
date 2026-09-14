import React from 'react';
import type { EnrolledCourse } from '../types';
import { RadialProgressRing } from './RadialProgressRing';

interface EnrolledCourseRowProps {
  course: EnrolledCourse;
  onResume?: (courseId: string) => void;
}

export const EnrolledCourseRow: React.FC<EnrolledCourseRowProps> = ({
  course,
  onResume,
}) => {
  return (
    <div className="card-interactive-blue flex items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-[#061A3A]/80 border border-[#167BDB]/30 hover:border-[#29A9FF]/60 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-200">
      {/* 1. Start edge (Right in RTL): Thumbnail + Title & Track Details */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        {/* Course Thumbnail */}
        <div className="size-11 sm:size-14 rounded-xl overflow-hidden shrink-0 border border-[#167BDB]/40 bg-[#040F24]">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Title, Track, and Last Activity */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-[#F1F5F9] font-['Cairo',sans-serif] truncate">
            {course.title}
          </h3>
          <div className="flex items-center gap-2 text-xs font-['Tajawal',sans-serif] text-[#8299B5]">
            <span className="truncate">{course.track}</span>
            {course.nextLiveTime && (
              <span className="inline-flex items-center gap-1 text-[#29A9FF] font-semibold">
                <span className="size-1.5 rounded-full bg-[#29A9FF] animate-pulse" />
                <span>{course.nextLiveTime}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. End edge (Left in RTL): Radial Progress Ring + Resume CTA */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {/* Animated Radial SVG Ring */}
        <RadialProgressRing progress={course.progress} size={42} strokeWidth={3.5} />

        {/* "استمر" Action Button */}
        <button
          onClick={() => onResume?.(course.id)}
          className="btn-pill-subtle px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-bold font-['Cairo',sans-serif] hover:border-[#E5B65C]/80 hover:text-[#E5B65C] transition-colors cursor-pointer active:scale-95 whitespace-nowrap"
        >
          استمر
        </button>
      </div>
    </div>
  );
};
