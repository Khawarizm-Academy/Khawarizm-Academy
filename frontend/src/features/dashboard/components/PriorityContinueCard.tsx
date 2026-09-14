import React from 'react';
import { mockPriorityContinueCourse } from '../data/mockDashboardData';

interface PriorityContinueCardProps {
  course?: typeof mockPriorityContinueCourse;
  onResume?: () => void;
}

export const PriorityContinueCard: React.FC<PriorityContinueCardProps> = ({
  course = mockPriorityContinueCourse,
  onResume,
}) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#061A3A]/90 to-[#040F24] rounded-2xl border border-[#167BDB]/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-5 sm:p-7 flex flex-col gap-6 transition-all duration-300">
      {/* Background Subtle Atmosphere */}
      <div className="absolute top-0 right-0 w-60 h-60 bg-[#167BDB]/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header Category Tag */}
      <div className="flex items-center justify-between">
        <span className="badge-blue">موصى به لليوم</span>
        <span className="text-xs text-[#8299B5] font-['Tajawal'] hidden sm:inline">
          آخر نشاط: أمس 08:30 م
        </span>
      </div>

      {/* 2. Course Title, Level & Thumbnail */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 flex flex-col gap-1.5">
          <h2 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] font-['Cairo',sans-serif] leading-tight">
            {course.title}
          </h2>
          <p className="text-sm text-[#8299B5] font-['Tajawal',sans-serif]">
            {course.levelDuration} • {course.instructorSubtitle}
          </p>
        </div>

        {/* Thumbnail with Glowing Border */}
        <div className="size-16 sm:size-20 rounded-2xl overflow-hidden shrink-0 border border-[#29A9FF]/40 shadow-[0_4px_16px_rgba(41,169,255,0.15)]">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>

      {/* 3. Progress Details & Linear Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs sm:text-sm font-['Tajawal'] text-[#8299B5]">
          <span className="font-bold text-[#DCE5EE]">{course.lessonStatus}</span>
          <span className="text-[#29A9FF] font-bold">{course.progress}% مكتمل</span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-2.5 rounded-full bg-[#0F2B5C]/60 overflow-hidden p-0.5 border border-[#167BDB]/30">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#29A9FF] to-[#167BDB] shadow-[0_0_10px_#29A9FF] transition-all duration-700 ease-out"
            style={{ width: `${course.progress}%` }}
          />
        </div>
      </div>

      {/* 4. Action Button */}
      <button
        onClick={onResume}
        className="btn-gold w-full py-3.5 sm:py-4 text-base font-bold font-['Cairo',sans-serif] shadow-[0_0_20px_rgba(229,182,92,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
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
        <span>استمر في التعلم</span>
      </button>
    </section>
  );
};
