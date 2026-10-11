import React from 'react';
import { useParams } from '@/app/routerContext';
import { CoursePlayerProvider } from '@/features/courses/context/CoursePlayerProvider';
import { DesktopCoursePlayerView } from '@/features/courses/components/views/CoursePlayerView/DesktopCoursePlayerView';
import { MobileCoursePlayerView } from '@/features/courses/components/views/CoursePlayerView/MobileCoursePlayerView';

/** Throws nothing at the surface layer; the provider owns lesson session state. */
export const CoursePlayerPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  return (
    <CoursePlayerProvider slug={slug}>
      <main className="content-container">
        <DesktopCoursePlayerView />
        <MobileCoursePlayerView />
      </main>
    </CoursePlayerProvider>
  );
};