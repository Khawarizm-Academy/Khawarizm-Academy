import React from 'react';
import type { Course, Scholarship } from '../../../shared/types/entities';
import { CourseCard } from '../../../shared/components/Cards/CourseCard';
import { ScholarshipCard } from '../../../shared/components/Cards/ScholarshipCard';

interface TwinPillarRailsProps {
  variant?: 'desktop' | 'mobile';
  courses: Course[];
  scholarships: Scholarship[];
  onViewAllCourses?: () => void;
  onViewAllScholarships?: () => void;
}

export const TwinPillarRails: React.FC<TwinPillarRailsProps> = ({
  variant = 'desktop',
  courses,
  scholarships,
  onViewAllCourses,
  onViewAllScholarships,
}) => {
  if (variant === 'mobile') {
    return (
      <div className="w-full space-y-8">
        
        {/* Section 1: Featured Courses (الدورات المميزة) */}
        <section className="w-full">
          {/* Header Row with Sky-Blue 4px Right Border Accent */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="pr-3 py-0.5 border-r-4 border-[#29A9FF]/90 flex items-center">
              <h3 className="text-xl font-bold text-white font-['IBM_Plex_Sans_Arabic']">
                الدورات المميزة
              </h3>
            </div>
            <button
              onClick={onViewAllCourses}
              className="text-xs text-[#29A9FF] hover:underline flex items-center gap-1 font-['Tajawal'] cursor-pointer"
            >
              <span>عرض الكل</span>
              <span>←</span>
            </button>
          </div>

          {/* Horizontal Swipeable Card Row */}
          <div className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 -mx-4 px-4 no-scrollbar scroll-smooth">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} layout="mobile" />
            ))}
          </div>
        </section>

        {/* Section 2: Available Scholarships (المنح والفرص المتاحة) */}
        <section className="w-full">
          {/* Header Row with Warm-Gold 4px Right Border Accent */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="pr-3 py-0.5 border-r-4 border-[#E5B65C]/90 flex items-center">
              <h3 className="text-xl font-bold text-white font-['IBM_Plex_Sans_Arabic']">
                المنح والفرص المتاحة
              </h3>
            </div>
            <button
              onClick={onViewAllScholarships}
              className="text-xs text-[#E5B65C] hover:underline flex items-center gap-1 font-['Tajawal'] cursor-pointer"
            >
              <span>عرض الكل</span>
              <span>←</span>
            </button>
          </div>

          {/* Horizontal Swipeable Card Row */}
          <div className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 -mx-4 px-4 no-scrollbar scroll-smooth">
            {scholarships.map((scholarship) => (
              <ScholarshipCard key={scholarship.id} scholarship={scholarship} layout="mobile" />
            ))}
          </div>
        </section>

      </div>
    );
  }

  // Desktop Variant: Side-by-side 50/50 Columns
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      
      {/* Right Column (Start in RTL): Featured Courses */}
      <section className="w-full">
        {/* Section Header with Soft Blended Horizontal Line */}
        <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-[#1B3F80]/40">
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#29A9FF]">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            <h3 className="text-2xl font-bold text-white font-['IBM_Plex_Sans_Arabic']">
              دورات مميزة
            </h3>
          </div>

          <button
            onClick={onViewAllCourses}
            className="text-xs text-[#8299B5] hover:text-[#29A9FF] flex items-center gap-1.5 font-['Tajawal'] transition-colors cursor-pointer group"
          >
            <span>عرض الكل</span>
            <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
          </button>
        </div>

        {/* 2-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {courses.slice(0, 2).map((course) => (
            <CourseCard key={course.id} course={course} layout="desktop" />
          ))}
        </div>
      </section>

      {/* Left Column (End in RTL): Available Scholarships */}
      <section className="w-full">
        {/* Section Header with Soft Blended Horizontal Line */}
        <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-[#1B3F80]/40">
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#E5B65C]">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            <h3 className="text-2xl font-bold text-white font-['IBM_Plex_Sans_Arabic']">
              منح متاحة
            </h3>
          </div>

          <button
            onClick={onViewAllScholarships}
            className="text-xs text-[#8299B5] hover:text-[#E5B65C] flex items-center gap-1.5 font-['Tajawal'] transition-colors cursor-pointer group"
          >
            <span>عرض الكل</span>
            <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
          </button>
        </div>

        {/* 2-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {scholarships.slice(0, 2).map((scholarship) => (
            <ScholarshipCard key={scholarship.id} scholarship={scholarship} layout="desktop" />
          ))}
        </div>
      </section>

    </div>
  );
};
