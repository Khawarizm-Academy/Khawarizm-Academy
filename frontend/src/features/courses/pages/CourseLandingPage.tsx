import React from 'react';
import { useParams } from '@/app/routerContext';
import { CourseDetailProvider } from '@/features/courses/context/CourseDetailProvider';
import { DesktopCourseLandingView } from '@/features/courses/components/views/CourseLandingView/DesktopCourseLandingView';
import { MobileCourseLandingView } from '@/features/courses/components/views/CourseLandingView/MobileCourseLandingView';

/** Throws nothing at the surface layer; the provider owns state, the shell owns chrome. */
export const CourseLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  return (
    <CourseDetailProvider slug={slug}>
      <main className="content-container">
        <DesktopCourseLandingView />
        <MobileCourseLandingView />
      </main>
    </CourseDetailProvider>
  );
};