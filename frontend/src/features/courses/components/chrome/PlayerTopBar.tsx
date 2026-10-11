import React from 'react';
import { ArrowLeft, Gauge } from 'lucide-react';
import { useNavigate, useParams } from '@/app/routerContext';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import type { CourseSurface } from '@/features/courses/types';

interface PlayerTopBarProps {
  surface: CourseSurface;
}

/** Top chrome row: back to the landing, course title, live progress chip. */
export const PlayerTopBar: React.FC<PlayerTopBarProps> = ({ surface }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { course, progress } = useCoursePlayer();
  if (!course) return null;

  return (
    <div className="player-bar">
      <button type="button" onClick={() => navigate(`/courses/${slug}`)} className="player-back">
        <ArrowLeft size={16} />
        {courseCopy.player.backLabel}
      </button>
      <h1 className="player-bar-title hidden sm:block">{course.title}</h1>
      <span className="player-progress-chip">
        <Gauge size={13} />
        {courseCopy.player.progressLabel} {progress}%
      </span>
      {surface === 'mobile' && (
        <span className="player-bar-title truncate sm:hidden">{course.title}</span>
      )}
    </div>
  );
};