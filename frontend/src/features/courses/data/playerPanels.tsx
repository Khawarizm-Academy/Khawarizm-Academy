import type { ComponentType } from 'react';
import { LessonPanel } from '@/features/courses/components/layout/LessonPanel';
import { ProblemsPanel } from '@/features/courses/components/layout/ProblemsPanel';
import { LiveSessionPanel } from '@/features/courses/components/layout/LiveSessionPanel';
import { ExamPanel } from '@/features/courses/components/layout/ExamPanel';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { DiscussionTab } from '@/features/discussions/components/DiscussionTab';
import { videoPlayerActions, useVideoPlayerState } from '@/features/courses/context/videoPlayerStore';
import type { CourseTab } from '@/features/courses/types';

const CourseDiscussionPanel: ComponentType = () => {
  const {
    courseSlug,
    activeLessonId,
    canPostDiscussions,
    canReplyDiscussions,
    canModerateDiscussions,
  } = useCoursePlayer();
  const player = useVideoPlayerState();
  if (!activeLessonId) return null;
  return (
    <DiscussionTab
      courseSlug={courseSlug}
      lessonId={activeLessonId}
      canPost={canPostDiscussions}
      canReply={canReplyDiscussions}
      canModerate={canModerateDiscussions}
      onJumpToTimestamp={(seconds) => videoPlayerActions.skip(seconds - player.currentMs / 1000)}
    />
  );
};

/** One body panel per player tab; switching tabs swops one component. */
export const PANEL_BY_TAB: Record<CourseTab, ComponentType> = {
  lesson: LessonPanel,
  problems: ProblemsPanel,
  live: LiveSessionPanel,
  exam: ExamPanel,
  discussion: CourseDiscussionPanel,
};
