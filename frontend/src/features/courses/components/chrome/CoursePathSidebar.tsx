import React from 'react';
import { Gauge } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { CoursePathModules } from '@/features/courses/components/layout/CoursePathModules';

/** Desktop path rail: sticky, scrolls internally, pinned under the top chrome. */
export const CoursePathSidebar: React.FC = () => {
  const { progress } = useCoursePlayer();

  return (
    <aside className="player-sidebar">
      <div className="player-sidebar-head">
        <h2 className="player-panel-title">{courseCopy.player.pathTitle}</h2>
        <span className="player-progress-chip">
          <Gauge size={13} />
          {progress}%
        </span>
      </div>

      <div className="course-progress-track">
        <div className="course-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <CoursePathModules />
    </aside>
  );
};