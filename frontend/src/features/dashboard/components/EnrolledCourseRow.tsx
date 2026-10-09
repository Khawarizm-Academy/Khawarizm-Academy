import React from 'react';
import { Palette, Code2, Brain, type LucideIcon } from 'lucide-react';
import { RadialProgressRing } from './RadialProgressRing';
import type { EnrolledCourse } from '../types';

/** Track icon and tone per course type from mockDashboard.json. */
const COURSE_ICON: Record<NonNullable<EnrolledCourse['iconType']>, { Icon: LucideIcon; tone: string }> = {
  uiux: { Icon: Palette, tone: 'text-blue-400' },
  python: { Icon: Code2, tone: 'text-emerald-400' },
  ai: { Icon: Brain, tone: 'text-blue-400' },
  data: { Icon: Brain, tone: 'text-blue-400' },
  code: { Icon: Code2, tone: 'text-emerald-400' },
};

interface EnrolledCourseRowProps {
  course: EnrolledCourse;
  onContinue?: () => void;
  /** Position in the list, used to stagger the entrance. */
  index?: number;
}

export const EnrolledCourseRow: React.FC<EnrolledCourseRowProps> = ({
  course,
  onContinue,
  index = 0,
}) => {
  const track = COURSE_ICON[course.iconType ?? 'uiux'];
  const TrackIcon = track.Icon;

  return (
    <div
      dir="rtl"
      className="dash-row md:gap-5 duration-200 select-none animate-pop-in"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Right side in RTL: thumbnail + course text info */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 text-right">
        {/* Course thumbnail */}
        <div className="dash-row-thumb">
          <TrackIcon size={22} className={track.tone} strokeWidth={1.8} />
        </div>

        {/* Text details */}
        <div className="dash-row-info">
          <h3 title={course.title} className="dash-row-title leading-5 md:leading-6 text-right">
            {course.title}
          </h3>
          <span className="dash-meta text-right">{course.track}</span>
        </div>
      </div>

      {/* Left side in RTL: progress ring + "استمر" action button */}
      <div className="dash-row-side md:gap-4">
        <RadialProgressRing progress={course.progress} size={44} strokeWidth={4} />
        <button type="button" onClick={onContinue} className="btn-pill-subtle">
          استمر
        </button>
      </div>
    </div>
  );
};
