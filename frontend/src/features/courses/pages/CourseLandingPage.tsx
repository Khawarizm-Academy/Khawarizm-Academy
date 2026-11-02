import React from 'react';
import { useParams } from '@/app/routerContext';
import { CourseDetailProvider } from '@/features/courses/context/CourseDetailProvider';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { DesktopCourseLandingView } from '@/features/courses/components/views/CourseLandingView/DesktopCourseLandingView';
import { MobileCourseLandingView } from '@/features/courses/components/views/CourseLandingView/MobileCourseLandingView';
import { CourseNotFound } from '@/features/courses/components/states/CourseNotFound';
import type { CourseLandingCourse } from '@/features/courses/types';

interface CourseLandingNoticesProps {
  course: CourseLandingCourse;
}

const CourseLandingNotices: React.FC<CourseLandingNoticesProps> = ({ course }) => (
  <div className="w-full flex flex-col gap-3" aria-label="معلومات حالة الدورة">
    {course.isPreview && (
      <div
        role="status"
        className="rounded-2xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-sm leading-relaxed text-blue-100 font-body"
      >
        هذه معاينة للدورة — بعض المحتوى قد يكون قيد الإعداد.
      </div>
    )}
    {course.status === 'archived' && course.enrollable === false && (
      <div
        role="note"
        className="rounded-2xl border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-sm leading-relaxed text-gold-100 font-body"
      >
        هذه الدورة مؤرشفة حاليًا، والتسجيل فيها غير متاح.
      </div>
    )}
  </div>
);

const CourseLandingContent: React.FC = () => {
  const { course } = useCourseDetail();
  const landingCourse = course as CourseLandingCourse | null;

  return (
    <main className="content-container">
      {landingCourse?.status === 'draft' ? (
        <CourseNotFound />
      ) : (
        <>
          {landingCourse && <CourseLandingNotices course={landingCourse} />}
          <DesktopCourseLandingView />
          <MobileCourseLandingView />
        </>
      )}
    </main>
  );
};

/** Throws nothing at the surface layer; the provider owns state, the shell owns chrome. */
export const CourseLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  return (
    <CourseDetailProvider slug={slug}>
      <CourseLandingContent />
    </CourseDetailProvider>
  );
};
