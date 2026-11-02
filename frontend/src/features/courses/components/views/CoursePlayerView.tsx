import React from 'react';
import { List } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { useVideoPlayerTheaterMode } from '@/features/courses/context/videoPlayerStore';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { PlayerTopBar } from '@/features/courses/components/chrome/PlayerTopBar';
import { LessonTabBar } from '@/features/courses/components/chrome/LessonTabBar';
import { PlayerStage } from '@/features/courses/components/layout/PlayerStage';
import { PlayerPanels } from '@/features/courses/components/layout/PlayerPanels';
import { CoursePathSidebar } from '@/features/courses/components/chrome/CoursePathSidebar';
import { PlayerSyllabusDrawer } from '@/features/courses/components/overlays/PlayerSyllabusDrawer';
import { PlayerMiniPlayer } from '@/features/courses/components/overlays/PlayerMiniPlayer';
import { CoursePlayerSkeleton } from '@/features/courses/components/states/CoursePlayerSkeleton';
import { CourseNotFound } from '@/features/courses/components/states/CourseNotFound';

/** Responsive learner player. The real media stage is mounted once across surfaces. */
export const CoursePlayerView: React.FC = () => {
  const { course, isLoading, activeTab, openSyllabus } = useCoursePlayer();
  const theaterMode = useVideoPlayerTheaterMode();

  return (
    <div className={`player-surface-responsive${theaterMode ? ' player-theater-mode' : ''}`}>
      {isLoading ? (
        <CoursePlayerSkeleton />
      ) : course ? (
        <>
          <PlayerTopBar />

          <div className="player-grid">
            <div className="player-main">
              <div className={activeTab === 'lesson' ? 'player-stage-slot' : 'player-stage-slot player-stage-slot-hidden-mobile'}>
                <PlayerStage />
              </div>

              <button type="button" onClick={openSyllabus} className="player-path-button lg:hidden">
                <List size={15} aria-hidden="true" />
                {courseCopy.player.pathButton}
              </button>

              <LessonTabBar />
              <PlayerPanels />
              {activeTab !== 'lesson' && <PlayerMiniPlayer />}
            </div>

            <CoursePathSidebar />
          </div>

          <PlayerSyllabusDrawer />
        </>
      ) : (
        <CourseNotFound />
      )}
    </div>
  );
};
