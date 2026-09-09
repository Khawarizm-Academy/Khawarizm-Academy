import React from 'react';
import type { Course } from '../../types/entities';
import { CourseThumbnail } from '../Artwork/BrandVisuals';

interface CourseCardProps {
  course: Course;
  layout?: 'desktop' | 'mobile';
  onDetails?: (course: Course) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  layout = 'desktop',
  onDetails,
}) => {
  const isMobile = layout === 'mobile';

  return (
    <div
      className={`group relative bg-[#061A3A]/70 backdrop-blur-md rounded-xl border border-[#1B3F80]/80 hover:border-[#29A9FF]/70 shadow-[0_4px_20px_rgba(0,0,0,0.40)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.65),0_0_22px_rgba(41,169,255,0.25)] hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer ${
        isMobile ? 'w-64 h-64 shrink-0' : 'w-full'
      }`}
    >
      {/* Media Thumbnail Container with Image Zoom on Card Hover */}
      <div className="relative w-full h-32 bg-[#092557] overflow-hidden">
        <CourseThumbnail type={course.thumbnailType} />

        {/* Level / Category Badge (Top Right in RTL) */}
        <div className="absolute top-2 right-2 bg-[#040F24]/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-[#29A9FF]/40 text-[#29A9FF] text-[11px] font-['IBM_Plex_Sans_Arabic'] font-semibold shadow-sm">
          {course.level}
        </div>

        {/* Category Tag on Left if provided */}
        {course.category && (
          <div className="absolute top-2 left-2 bg-[#061A3A]/90 px-2 py-0.5 rounded-md border border-[#1B3F80] text-[#8299B5] text-[10px] font-mono">
            {course.category}
          </div>
        )}

        {/* 2px Tech-Blue Accent Bar at Bottom of Thumbnail that blooms on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-l from-[#29A9FF] via-[#167BDB] to-transparent transition-all duration-300 group-hover:shadow-[0_0_10px_#29A9FF]" />
      </div>

      {/* Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-base font-semibold text-[#DCE5EE] group-hover:text-white line-clamp-2 leading-snug font-['Tajawal'] text-right transition-colors">
            {course.title}
          </h4>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#1B3F80]">
          <div className="flex items-center justify-between text-xs text-[#8299B5] font-['Tajawal'] mb-3">
            {/* Duration with Clock Icon */}
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8299B5]">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{course.duration}</span>
            </div>

            {/* Students Count or Status */}
            {course.studentsCount ? (
              <span className="text-[#8299B5] flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                {course.studentsCount}
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  course.status === 'متاح'
                    ? 'bg-[#29A9FF]/15 text-[#29A9FF] border-[#29A9FF]/40 shadow-[0_0_8px_rgba(41,169,255,0.25)]'
                    : 'bg-[#092557] text-[#8299B5] border-[#1B3F80]'
                }`}
              >
                {course.status || 'متاح'}
              </span>
            )}
          </div>

          {/* Action Button (Desktop Only per screenshots) */}
          {!isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDetails?.(course);
              }}
              className="w-full py-2 px-3 rounded-lg bg-[#061A3A] hover:bg-[#167BDB]/20 border border-[#167BDB]/50 hover:border-[#29A9FF] text-[#29A9FF] hover:text-white text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              تفاصيل الدورة
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
