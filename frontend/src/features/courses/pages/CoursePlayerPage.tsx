import React from 'react';
import { useParams } from '@/app/routerContext';
import { CoursePlayerProvider } from '@/features/courses/context/CoursePlayerProvider';
import { CoursePlayerView } from '@/features/courses/components/views/CoursePlayerView';

/** Throws nothing at the surface layer; the provider owns lesson session state. */
export const CoursePlayerPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  return (
    <CoursePlayerProvider slug={slug}>
      <main className="content-container">
        <CoursePlayerView />
      </main>
    </CoursePlayerProvider>
  );
};
