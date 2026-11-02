import React from 'react';
import { useParams } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { CoursePlayerProvider } from '@/features/courses/context/CoursePlayerProvider';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { CoursePlayerView } from '@/features/courses/components/views/CoursePlayerView';
import { LearnerAnnouncementList } from '@/features/studio/announcements/components/LearnerAnnouncementList';

const CoursePlayerAnnouncements: React.FC<{ courseSlug: string }> = ({ courseSlug }) => {
  const { course } = useCoursePlayer();
  return course?.canReadAnnouncements ? <LearnerAnnouncementList courseSlug={courseSlug} /> : null;
};

/** Throws nothing at the surface layer; the provider owns lesson session state. */
export const CoursePlayerPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  return (
      <CoursePlayerProvider key={`${slug}:${user?.id ?? 'anonymous'}`} slug={slug}>
        <main className="content-container">
        <CoursePlayerAnnouncements courseSlug={slug} />
        <CoursePlayerView />
      </main>
    </CoursePlayerProvider>
  );
};
