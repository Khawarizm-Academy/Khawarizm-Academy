import React from 'react';
import { Gauge } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { CoursePathModules } from '@/features/courses/components/layout/CoursePathModules';

/** Mobile syllabus sheet: scrim + slide-up panel sharing the same path list. */
export const PlayerSyllabusDrawer: React.FC = () => {
  const { isSyllabusOpen, closeSyllabus, progress } = useCoursePlayer();
  if (!isSyllabusOpen) return null;

  return (
    <div className="player-drawer">
      <button type="button" className="player-drawer-scrim" onClick={closeSyllabus} aria-label="إغلاق المسار" />

      <div className="player-drawer-panel animate-fade-in-up">
        <div className="player-drawer-handle" />

        <div className="flex-between">
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
      </div>
    </div>
  );
};