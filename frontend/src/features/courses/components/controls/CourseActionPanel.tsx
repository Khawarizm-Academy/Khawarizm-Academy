import React from 'react';
import { Heart } from 'lucide-react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { CoursePrimaryCta } from '@/features/courses/components/controls/CoursePrimaryCta';
import type { CourseSurface } from '@/features/courses/types';

interface CourseActionPanelProps {
  surface: CourseSurface;
}

/** Card width differs only by surface: the desktop card rides the sticky aside. */
const PANEL_CLASS: Record<CourseSurface, string> = {
  desktop: 'course-action-card',
  mobile: 'course-action-card w-full',
};

const FAV_TONE: Record<'on' | 'off', string> = {
  on: 'text-gold-400 fill-gold-400',
  off: 'text-slate-400 hover:text-gold-400',
};

/** Price, the single primary CTA, resume progress and the favorite toggle. */
export const CourseActionPanel: React.FC<CourseActionPanelProps> = ({ surface }) => {
  const { course, isEnrolled, isFavorite, progress, toggleFavorite } = useCourseDetail();
  if (!course) return null;

  const favState = isFavorite ? 'on' : 'off';
  const favLabel = isFavorite ? courseCopy.landing.favoritedLabel : courseCopy.landing.favoriteLabel;
  const priceClass = course.priceType === 'free' ? 'course-action-price-free' : 'course-action-price';

  return (
    <div className={PANEL_CLASS[surface]}>
      <div className="flex-between gap-3">
        <span className={priceClass}>{course.priceLabel}</span>
        {isEnrolled && <span className="badge-pill bg-blue-400/10 border border-blue-400/40 text-blue-400">{courseCopy.landing.enrolledLabel}</span>}
      </div>

      <CoursePrimaryCta />

      {isEnrolled ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex-between text-[11px] text-slate-400 font-body">
            <span>{courseCopy.landing.syllabusStat}</span>
            <span className="tabular-nums text-blue-400 font-display font-bold">{progress}%</span>
          </div>
          <div className="course-progress-track">
            <div className="course-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <p className="course-action-note">{courseCopy.landing.syllabusStat}</p>
      )}

      <button type="button" onClick={toggleFavorite} className="btn-pill-subtle w-full py-2.5 text-xs">
        <Heart size={14} className={FAV_TONE[favState]} />
        {favLabel}
      </button>
    </div>
  );
};