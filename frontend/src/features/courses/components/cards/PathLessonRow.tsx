import React from 'react';
import { Check, Lock, Play, PlayCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CourseLesson, CourseLessonStatus } from '@/shared/types/entities';

/** Status mark: checkmark when done, play when active, circle when reachable, lock when gated. */
const STATUS_MARK: Record<CourseLessonStatus, { icon: LucideIcon; className: string }> = {
  completed: { icon: Check, className: 'player-lesson-index border-success-500/50 text-success-500 bg-success-500/10' },
  active: { icon: Play, className: 'player-lesson-index border-blue-400 text-blue-400 bg-blue-400/15' },
  available: { icon: PlayCircle, className: 'player-lesson-index border-navy-600 text-slate-300' },
  locked: { icon: Lock, className: 'player-lesson-index border-navy-600/40 text-slate-500' },
};

const ROW_CLASS: Record<CourseLessonStatus, string> = {
  active: 'player-lesson player-lesson-active',
  completed: 'player-lesson player-lesson-completed',
  available: 'player-lesson player-lesson-available',
  locked: 'player-lesson player-lesson-locked',
};

const NAME_CLASS: Record<CourseLessonStatus, string> = {
  active: 'player-lesson-name',
  completed: 'player-lesson-name',
  available: 'player-lesson-name',
  locked: 'player-lesson-name text-slate-500',
};

interface PathLessonRowProps {
  lesson: CourseLesson;
  status: CourseLessonStatus;
  onSelect: (lessonId: string) => void;
}

/** One lesson row in the path sidebar or mobile syllabus drawer. */
export const PathLessonRow: React.FC<PathLessonRowProps> = ({ lesson, status, onSelect }) => {
  const mark = STATUS_MARK[status];

  return (
    <button type="button" onClick={() => onSelect(lesson.id)} disabled={status === 'locked'} className={ROW_CLASS[status]}>
      <span className={mark.className}>
        <mark.icon size={12} />
      </span>
      <span className="player-lesson-body">
        <span className={NAME_CLASS[status]}>{lesson.title}</span>
        <span className="player-lesson-meta">{lesson.duration}</span>
      </span>
    </button>
  );
};