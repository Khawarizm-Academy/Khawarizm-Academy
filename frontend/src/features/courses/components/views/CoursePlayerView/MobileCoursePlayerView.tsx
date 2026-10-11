import React from 'react';
import { List } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { PlayerTopBar } from '@/features/courses/components/chrome/PlayerTopBar';
import { LessonTabBar } from '@/features/courses/components/chrome/LessonTabBar';
import { PlayerStage } from '@/features/courses/components/layout/PlayerStage';
import { PlayerPanels } from '@/features/courses/components/layout/PlayerPanels';
import { PlayerSyllabusDrawer } from '@/features/courses/components/overlays/PlayerSyllabusDrawer';
import { PlayerMiniPlayer } from '@/features/courses/components/overlays/PlayerMiniPlayer';
import { CoursePlayerSkeleton } from '@/features/courses/components/states/CoursePlayerSkeleton';
import { CourseNotFound } from '@/features/courses/components/states/CourseNotFound';

/** Mobile player: pinned stage on the lesson tab, drawer for the path, mini-player elsewhere. */
export const MobileCoursePlayerView: React.FC = () => {
  const { course, isLoading, activeTab, openSyllabus } = useCoursePlayer();

  return (
    <div className="player-surface-mobile">
      {isLoading ? (
        <CoursePlayerSkeleton />
      ) : course ? (
        <>
          <PlayerTopBar surface="mobile" />

          {activeTab === 'lesson' && (
            <div className="player-stage-sticky">
              <PlayerStage />
            </div>
          )}

          <button type="button" onClick={openSyllabus} className="player-path-button">
            <List size={15} />
            {courseCopy.player.pathButton}
          </button>

          <LessonTabBar />

          <div className="player-tab-body">
            <PlayerPanels />
          </div>

          {activeTab !== 'lesson' && <PlayerMiniPlayer />}
        </>
      ) : (
        <CourseNotFound />
      )}

      <PlayerSyllabusDrawer />
    </div>
  );
};