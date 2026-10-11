import React from 'react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { PlayerTopBar } from '@/features/courses/components/chrome/PlayerTopBar';
import { LessonTabBar } from '@/features/courses/components/chrome/LessonTabBar';
import { PlayerStage } from '@/features/courses/components/layout/PlayerStage';
import { PlayerPanels } from '@/features/courses/components/layout/PlayerPanels';
import { CoursePathSidebar } from '@/features/courses/components/chrome/CoursePathSidebar';
import { CoursePlayerSkeleton } from '@/features/courses/components/states/CoursePlayerSkeleton';
import { CourseNotFound } from '@/features/courses/components/states/CourseNotFound';

/** Desktop player: video + tabs in the main column, sticky course path rail. */
export const DesktopCoursePlayerView: React.FC = () => {
  const { course, isLoading } = useCoursePlayer();

  return (
    <div className="player-surface-desktop">
      {isLoading ? (
        <CoursePlayerSkeleton />
      ) : course ? (
        <>
          <PlayerTopBar surface="desktop" />

          <div className="player-grid">
            <div className="player-main">
              <PlayerStage />
              <LessonTabBar />
              <PlayerPanels />
            </div>

            <CoursePathSidebar />
          </div>
        </>
      ) : (
        <CourseNotFound />
      )}
    </div>
  );
};