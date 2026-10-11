import React from 'react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { CourseBreadcrumb } from '@/features/courses/components/chrome/CourseBreadcrumb';
import { CourseHeaderBlock } from '@/features/courses/components/hero/CourseHeaderBlock';
import { CourseActionPanel } from '@/features/courses/components/controls/CourseActionPanel';
import { CourseOutcomes } from '@/features/courses/components/layout/CourseOutcomes';
import { CourseCurriculum } from '@/features/courses/components/layout/CourseCurriculum';
import { CourseAbout } from '@/features/courses/components/layout/CourseAbout';
import { LiveSessionCard } from '@/features/courses/components/cards/LiveSessionCard';
import { ExamCalloutCard } from '@/features/courses/components/cards/ExamCalloutCard';
import { InstructorCard } from '@/features/courses/components/cards/InstructorCard';
import { RelatedCoursesRail } from '@/features/courses/components/layout/RelatedCoursesRail';
import { CourseLandingSkeleton } from '@/features/courses/components/states/CourseLandingSkeleton';
import { CourseNotFound } from '@/features/courses/components/states/CourseNotFound';

/** Desktop landing: sticky CTA aside, two-column hero, full-width sections below. */
export const DesktopCourseLandingView: React.FC = () => {
  const { course, isLoading } = useCourseDetail();

  return (
    <div className="course-surface-desktop">
      {isLoading ? (
        <CourseLandingSkeleton />
      ) : course ? (
        <>
          <CourseBreadcrumb course={course} />

          <div className="course-hero-grid">
            <div className="course-hero-main">
              <CourseHeaderBlock course={course} />
            </div>
            <div className="course-hero-aside">
              <CourseActionPanel surface="desktop" />
            </div>
          </div>

          <CourseOutcomes />
          <CourseCurriculum />
          <CourseAbout />

          <div className="course-info-grid">
            <LiveSessionCard />
            <ExamCalloutCard />
          </div>

          <InstructorCard />
          <RelatedCoursesRail relatedIds={course.relatedIds} />
        </>
      ) : (
        <CourseNotFound />
      )}
    </div>
  );
};