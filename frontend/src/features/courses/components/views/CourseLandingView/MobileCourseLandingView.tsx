import React from 'react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { CourseBreadcrumb } from '@/features/courses/components/chrome/CourseBreadcrumb';
import { CourseHeaderBlock } from '@/features/courses/components/hero/CourseHeaderBlock';
import { CourseActionPanel } from '@/features/courses/components/controls/CourseActionPanel';
import { CourseStickyCta } from '@/features/courses/components/controls/CourseStickyCta';
import { CourseOutcomes } from '@/features/courses/components/layout/CourseOutcomes';
import { CourseCurriculum } from '@/features/courses/components/layout/CourseCurriculum';
import { CourseAbout } from '@/features/courses/components/layout/CourseAbout';
import { LiveSessionCard } from '@/features/courses/components/cards/LiveSessionCard';
import { ExamCalloutCard } from '@/features/courses/components/cards/ExamCalloutCard';
import { InstructorCard } from '@/features/courses/components/cards/InstructorCard';
import { RelatedCoursesRail } from '@/features/courses/components/layout/RelatedCoursesRail';
import { CourseLandingSkeleton } from '@/features/courses/components/states/CourseLandingSkeleton';
import { CourseNotFound } from '@/features/courses/components/states/CourseNotFound';

/** Mobile landing: one-column hero, inline action card plus a sticky enroll bar. */
export const MobileCourseLandingView: React.FC = () => {
  const { course, isLoading, isEnrolled } = useCourseDetail();

  return (
    <div className="course-surface-mobile">
      {isLoading ? (
        <CourseLandingSkeleton />
      ) : course ? (
        <>
          <CourseBreadcrumb course={course} />
          <CourseHeaderBlock course={course} />
          <CourseActionPanel surface="mobile" />
          <CourseOutcomes />
          <CourseCurriculum />
          <CourseAbout />
          <LiveSessionCard />
          <ExamCalloutCard />
          <InstructorCard />
          <RelatedCoursesRail slug={course.id} relatedIds={course.relatedIds} />
          {!isEnrolled && <CourseStickyCta />}
        </>
      ) : (
        <CourseNotFound />
      )}
    </div>
  );
};