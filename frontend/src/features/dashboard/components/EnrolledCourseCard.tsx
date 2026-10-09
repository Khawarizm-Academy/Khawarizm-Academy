import React from 'react';
import { RadialProgressRing } from './RadialProgressRing';
import { RING_COLORS } from '../data/radialRingColors';
import type { EnrolledCourse } from '../types';

interface EnrolledCourseCardProps {
  course: EnrolledCourse;
  onResume: (course: EnrolledCourse) => void;
  onViewCertificate?: (course: EnrolledCourse) => void;
  onJoinLive?: (course: EnrolledCourse) => void;
  /** Position in the list, used to stagger the entrance. */
  index?: number;
}

export const EnrolledCourseCard: React.FC<EnrolledCourseCardProps> = ({
  course,
  onResume,
  onViewCertificate,
  onJoinLive,
  index = 0,
}) => {
  const isCompleted = course.isCompleted || course.progress >= 100;
  const cardTone = isCompleted ? 'dash-course-card-done' : 'dash-course-card-active';
  const actionTone = isCompleted ? 'dash-course-action-done' : 'dash-course-action-active';
  const ringColor = isCompleted ? RING_COLORS.done : RING_COLORS.active;

  const handleAction = () => {
    if (isCompleted && onViewCertificate) return onViewCertificate(course);
    onResume(course);
  };

  // Details block shared by the desktop row and the mobile stack.
  const details = (
    <>
      <h3
        onClick={() => onResume(course)}
        title={course.title}
        className="dash-course-title"
      >
        {course.title}
      </h3>

      <div className="dash-meta self-stretch">
        {course.instructor || 'أكاديمية خوارزم'}{' '}
        {course.totalLessons ? `· ${course.totalLessons} درسًا` : ''}
      </div>

      <div className="dash-course-unit">{course.exactUnitLesson || course.lastLesson}</div>

      {course.nextLiveTime && !isCompleted && (
        <button
          type="button"
          onClick={() => onJoinLive?.(course)}
          className="dash-course-live"
        >
          <span className="dash-course-live-dot" />
          <span>جلسة مباشرة: {course.nextLiveTime}</span>
        </button>
      )}
    </>
  );

  return (
    <article
      dir="rtl"
      className={`dash-course-card ${cardTone} animate-pop-in`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Desktop row */}
      <div className="hidden md:flex justify-between items-center gap-5 p-4">
        {/* Action and progress */}
        <div className="w-40 shrink-0 inline-flex flex-col justify-center items-center gap-3">
          <button
            type="button"
            onClick={handleAction}
            className={`dash-course-action ${actionTone} self-stretch px-4 py-2.5`}
          >
            {isCompleted ? 'عرض الشهادة' : 'استمر'}
          </button>

          <RadialProgressRing
            progress={course.progress}
            size={56}
            strokeWidth={4.5}
            color={ringColor}
          />
        </div>

        {/* Course details */}
        <div className="dash-course-details flex-1 min-w-0">{details}</div>

        {/* Thumbnail */}
        <div className="dash-course-thumb w-44 h-28 group shrink-0">
          <img
            src={course.thumbnail}
            alt={course.title}
            loading="lazy"
            className="dash-course-thumb-img"
          />
          <div className="dash-course-shade" />
        </div>
      </div>

      {/* Mobile stack */}
      <div className="flex md:hidden flex-col justify-start items-start gap-4 p-3.5">
        {/* Banner thumbnail */}
        <div className="dash-course-thumb w-full h-32">
          <img
            src={course.thumbnail}
            alt={course.title}
            loading="lazy"
            className="dash-course-thumb-img"
          />
          <div className="dash-course-shade" />
        </div>

        {/* Action and progress bar */}
        <div className="self-stretch inline-flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={handleAction}
            className={`dash-course-action ${actionTone} px-5 py-2`}
          >
            {isCompleted ? 'عرض الشهادة' : 'استمر'}
          </button>

          <RadialProgressRing
            progress={course.progress}
            size={52}
            strokeWidth={4.5}
            color={ringColor}
          />
        </div>

        {/* Course details block */}
        <div className="dash-course-details self-stretch">{details}</div>
      </div>
    </article>
  );
};
