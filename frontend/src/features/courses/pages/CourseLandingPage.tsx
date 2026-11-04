import React from 'react';
import { useParams } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { CourseDetailProvider } from '@/features/courses/context/CourseDetailProvider';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { DesktopCourseLandingView } from '@/features/courses/components/views/CourseLandingView/DesktopCourseLandingView';
import { MobileCourseLandingView } from '@/features/courses/components/views/CourseLandingView/MobileCourseLandingView';
import { CourseNotFound } from '@/features/courses/components/states/CourseNotFound';
import { LearnerAnnouncementBanner } from '@/features/studio/announcements/components/LearnerAnnouncementBanner';
import { CourseReviewsSection } from '@/features/reviews/components/CourseReviewsSection';
import type { CourseLandingCourse } from '@/features/courses/types';

interface CourseLandingNoticesProps {
  course: CourseLandingCourse;
  courseSlug: string;
  canReadAnnouncements: boolean;
}

const CourseLandingNotices: React.FC<CourseLandingNoticesProps> = ({ course, courseSlug, canReadAnnouncements }) => (
  <div className="w-full flex flex-col gap-3" aria-label="معلومات حالة الدورة">
    {course.isPreview && (
      <div
        role="status"
        className="rounded-2xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-sm leading-relaxed text-blue-100 font-body"
      >
        هذه معاينة خاصة للدورة غير المنشورة — ما تراه متاحًا لموظفي الدورة فقط، ولن يظهر للمتعلمين قبل النشر.
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
    {canReadAnnouncements && <LearnerAnnouncementBanner courseSlug={courseSlug} />}
  </div>
);

const CourseLandingContent: React.FC<{ courseSlug: string }> = ({ courseSlug }) => {
  const { course, isLoading, isEnrolled, isEnrollmentPending } = useCourseDetail();
  const landingCourse = course as CourseLandingCourse | null;

  if (!landingCourse && !isLoading) {
    return (
      <main className="content-container">
        <CourseNotFound />
      </main>
    );
  }

  return (
    <main className="content-container">
      <>
        {landingCourse && <CourseLandingNotices course={landingCourse} courseSlug={courseSlug} canReadAnnouncements={landingCourse.canReadAnnouncements === true && !(isEnrolled && isEnrollmentPending)} />}
        <DesktopCourseLandingView />
        <MobileCourseLandingView />
        {/* Reviews are public proof; a private preview course must not probe a learner inbox. */}
        {landingCourse && !landingCourse.isPreview && <CourseReviewsSection slug={courseSlug} />}
      </>
    </main>
  );
};

/** Throws nothing at the surface layer; the provider owns state, the shell owns chrome. */
export const CourseLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  return (
    <CourseDetailProvider key={`${slug}:${user?.id ?? 'anonymous'}`} slug={slug}>
      <CourseLandingContent courseSlug={slug} />
    </CourseDetailProvider>
  );
};
