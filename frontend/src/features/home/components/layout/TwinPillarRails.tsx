import React from 'react';
import { ArrowLeft, GraduationCap, Sparkles } from 'lucide-react';
import type { Course, Scholarship } from '@/shared/types/entities';
import { CourseCard } from '@/shared/components/Cards/CourseCard';
import { ScholarshipCard } from '@/shared/components/Cards/ScholarshipCard';
import { toArabic } from '@/shared/lib/localization';
import { useHorizontalScroll } from '@/shared/hooks/useHorizontalScroll';

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
  const coursesRowRef = useHorizontalScroll<HTMLDivElement>();
  const scholarshipsRowRef = useHorizontalScroll<HTMLDivElement>();

  if (variant === 'mobile') {
    return (
      <div className="w-full space-y-8">
        
        {/* Section 1: Featured Courses (الدورات المميزة) */}
        <section className="w-full">
          {/* Header Row with Sky-Blue 4px Right Border Accent */}
          <div className="flex-between mb-3.5">
            <div className="section-accent-title-blue">
              <h3 className="text-xl font-bold text-white font-display">
                الدورات المميزة
              </h3>
            </div>
            <button
              onClick={onViewAllCourses}
              className="link-action-blue font-semibold"
            >
              <span>{toArabic('actions', 'view_all')}</span>
              <ArrowLeft size={16} />
            </button>
          </div>

          {/* Horizontal Swipeable Card Row — cards cascade in with a soft stagger */}
          <div ref={coursesRowRef} className="horizontal-scroll-row no-scrollbar">
            {courses.map((course, idx) => (
              <div key={course.id} className="shrink-0 animate-pop-in" style={{ animationDelay: `${idx * 80}ms` }}>
                <CourseCard course={course} layout="mobile" />
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Available Scholarships (المنح والفرص المتاحة) */}
        <section className="w-full">
          {/* Header Row with Warm-Gold 4px Right Border Accent */}
          <div className="flex-between mb-3.5">
            <div className="section-accent-title-gold">
              <h3 className="text-xl font-bold text-white font-display">
                المنح والفرص المتاحة
              </h3>
            </div>
            <button
              onClick={onViewAllScholarships}
              className="link-action-gold font-semibold"
            >
              <span>{toArabic('actions', 'view_all')}</span>
              <ArrowLeft size={16} />
            </button>
          </div>

          {/* Horizontal Swipeable Card Row — cards cascade in with a soft stagger */}
          <div ref={scholarshipsRowRef} className="horizontal-scroll-row no-scrollbar">
            {scholarships.map((scholarship, idx) => (
              <div key={scholarship.id} className="shrink-0 animate-pop-in" style={{ animationDelay: `${idx * 80}ms` }}>
                <ScholarshipCard scholarship={scholarship} layout="mobile" />
              </div>
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
        <div className="section-header-row">
          <div className="flex items-center gap-2.5">
            <GraduationCap size={22} className="text-blue-400" />
            <h3 className="text-2xl font-bold text-white font-display">
              دورات مميزة
            </h3>
          </div>

          <button
            onClick={onViewAllCourses}
            className="link-action-blue group"
          >
            <span>{toArabic('actions', 'view_all')}</span>
            <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
          </button>
        </div>

        {/* 2-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
          {courses.slice(0, 2).map((course, idx) => (
            <div key={course.id} className="animate-pop-in" style={{ animationDelay: `${idx * 100}ms` }}>
              <CourseCard course={course} layout="desktop" />
            </div>
          ))}
        </div>
      </section>

      {/* Left Column (End in RTL): Available Scholarships */}
      <section className="w-full">
        {/* Section Header with Soft Blended Horizontal Line */}
        <div className="section-header-row">
          <div className="flex items-center gap-2.5">
            <Sparkles size={22} className="text-gold-400" />
            <h3 className="text-2xl font-bold text-white font-display">
              منح متاحة
            </h3>
          </div>

          <button
            onClick={onViewAllScholarships}
            className="link-action-gold group"
          >
            <span>{toArabic('actions', 'view_all')}</span>
            <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
          </button>
        </div>

        {/* 2-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
          {scholarships.slice(0, 2).map((scholarship, idx) => (
            <div key={scholarship.id} className="animate-pop-in" style={{ animationDelay: `${idx * 100}ms` }}>
              <ScholarshipCard scholarship={scholarship} layout="desktop" />
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
