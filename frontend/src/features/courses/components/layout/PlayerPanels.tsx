import React, { type ComponentType } from 'react';
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
const PANEL_BY_TAB: Record<CourseTab, ComponentType> = {
  lesson: LessonPanel,
  problems: ProblemsPanel,
  live: LiveSessionPanel,
  exam: ExamPanel,
  discussion: CourseDiscussionPanel,
};

/** The active tab's body, shared by the desktop and mobile player surfaces. */
export const PlayerPanels: React.FC = () => {
  const { activeTab } = useCoursePlayer();
  const Panel = PANEL_BY_TAB[activeTab];
  // Keying by tab remounts the panel so each switch plays the entrance again.
  return (
    <div className="animate-fade-in-up min-w-0" key={activeTab}>
      <Panel />
    </div>
  );
};
