import React from 'react';
import { Check, ChevronDown, Lock, Play, PlayCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CourseLesson, CourseLessonStatus, CourseModule } from '@/shared/types/entities';

interface CurriculumModuleCardProps {
  module: CourseModule;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  getStatus: (lessonId: string) => CourseLessonStatus;
  onSelectLesson: (lessonId: string) => void;
}

/** Status mark: checkmark when done, play when next, lock when gated. */
const STATUS_MARK: Record<CourseLessonStatus, { icon: LucideIcon; className: string }> = {
  completed: { icon: Check, className: 'course-lesson-mark course-lesson-mark-completed' },
  active: { icon: Play, className: 'course-lesson-mark course-lesson-mark-active' },
  available: { icon: PlayCircle, className: 'course-lesson-mark course-lesson-mark-available' },
  locked: { icon: Lock, className: 'course-lesson-mark course-lesson-mark-locked' },
};

/** One module of the syllabus accordion with its lesson rows. */
export const CurriculumModuleCard: React.FC<CurriculumModuleCardProps> = ({
  module,
  index,
  isOpen,
  onToggle,
  getStatus,
  onSelectLesson,
}) => {
  return (
    <div className="course-accordion-item animate-pop-in" style={{ animationDelay: `${index * 90}ms` }}>
      <button type="button" onClick={onToggle} className="course-accordion-head" aria-expanded={isOpen}>
        <span className="course-accordion-index">{index}</span>
        <span className="course-accordion-title">{module.title}</span>
        <span className="text-[11px] text-slate-400 font-body shrink-0">{module.lessons.length} دروس</span>
        <ChevronDown size={18} className={`course-accordion-chevron ${isOpen ? 'course-accordion-chevron-open' : ''}`} />
      </button>

      {isOpen && (
        <div className="course-accordion-body animate-fade-in-up">
          {module.lessons.map((lesson: CourseLesson) => {
            const status = getStatus(lesson.id);
            const mark = STATUS_MARK[status];
            const locked = status === 'locked';
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => onSelectLesson(lesson.id)}
                disabled={locked}
                className={locked ? 'course-lesson-row cursor-not-allowed opacity-70' : 'course-lesson-row'}
              >
                <span className={mark.className}>
                  <mark.icon size={13} />
                </span>
                <span className={locked ? 'course-lesson-title course-lesson-title-locked' : 'course-lesson-title'}>
                  {lesson.title}
                </span>
                <span className="course-lesson-duration">{lesson.duration}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};