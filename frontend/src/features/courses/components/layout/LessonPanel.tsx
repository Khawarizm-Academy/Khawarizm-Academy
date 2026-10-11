import React from 'react';
import { BookOpen, CheckCheck, ClipboardCheck } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';

/** Lesson tab body: the key-points recap plus the mark-complete CTA. */
export const LessonPanel: React.FC = () => {
  const { activeLesson, completedIds, completeLesson } = useCoursePlayer();
  if (!activeLesson) return null;

  const isDone = completedIds.includes(activeLesson.id);

  return (
    <div className="player-panel">
      <div className="player-panel-head">
        <BookOpen size={16} className="text-blue-400 shrink-0" />
        <h2 className="player-panel-title">{courseCopy.player.summaryTitle}</h2>
      </div>

      <p className="player-summary-text">{activeLesson.summary}</p>

      {isDone ? (
        <span className="badge-pill bg-success-500/10 border border-success-500/40 text-success-500 self-start">
          <CheckCheck size={13} />
          {courseCopy.player.completedLabel}
        </span>
      ) : (
        <button type="button" onClick={completeLesson} className="btn-outline-blue self-start text-sm">
          <ClipboardCheck size={16} />
          {courseCopy.player.markComplete}
        </button>
      )}
    </div>
  );
};