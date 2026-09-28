import React from 'react';
import { RadialProgressRing } from './RadialProgressRing';
import type { EnrolledCourse } from '../types';

interface EnrolledCourseCardProps {
  course: EnrolledCourse;
  onResume: (course: EnrolledCourse) => void;
  onViewCertificate?: (course: EnrolledCourse) => void;
  onJoinLive?: (course: EnrolledCourse) => void;
}

export const EnrolledCourseCard: React.FC<EnrolledCourseCardProps> = ({
  course,
  onResume,
  onViewCertificate,
  onJoinLive,
}) => {
  const isCompleted = course.isCompleted || course.progress >= 100;
  const ringColor = isCompleted ? '#E5B65C' : '#29A9FF';

  const handleAction = () => {
    if (isCompleted && onViewCertificate) {
      onViewCertificate(course);
    } else {
      onResume(course);
    }
  };

  return (
    <article
      dir="rtl"
      className={`self-stretch bg-slate-900 rounded-2xl transition-all duration-300 overflow-hidden select-none ${
        isCompleted
          ? 'outline outline-1 outline-offset-[-1px] outline-orange-300/40 hover:outline-orange-300 shadow-[0px_8px_24px_0px_rgba(229,182,92,0.12)]'
          : 'outline outline-1 outline-offset-[-1px] outline-blue-900 hover:outline-sky-400/80 shadow-[0px_8px_24px_0px_rgba(41,169,255,0.1)]'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. DESKTOP LAYOUT (Horizontal row: Thumbnail right, Text center, Action left) */}
      {/* ========================================================================= */}
      <div className="hidden md:flex justify-between items-center gap-5 p-4">
        {/* Child #1 in RTL: Action and Progress (renders on the FAR LEFT) */}
        <div className="w-40 shrink-0 inline-flex flex-col justify-center items-center gap-3">
          <button
            type="button"
            onClick={handleAction}
            className={`self-stretch px-4 py-2.5 rounded-full inline-flex justify-center items-center text-xs font-bold font-['Tajawal'] transition-all duration-200 cursor-pointer active:scale-95 ${
              isCompleted
                ? 'bg-blue-950 outline outline-1 outline-offset-[-1px] outline-orange-300 text-orange-300 hover:bg-orange-300/10 shadow-[0_0_12px_rgba(229,182,92,0.25)]'
                : 'bg-sky-400 hover:bg-sky-300 text-slate-900 shadow-[0_0_14px_rgba(41,169,255,0.35)]'
            }`}
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

        {/* Child #2 in RTL: Course Details (renders in the CENTER) */}
        <div className="flex-1 min-w-0 flex flex-col justify-start items-start text-right gap-1.5">
          <h3
            onClick={() => onResume(course)}
            title={course.title}
            className="self-stretch text-white text-lg font-bold font-['IBM_Plex_Sans_Arabic'] leading-6 hover:text-sky-300 transition-colors cursor-pointer truncate"
          >
            {course.title}
          </h3>

          <div className="self-stretch text-slate-400 text-xs font-normal font-['Tajawal'] leading-4">
            {course.instructor || 'أكاديمية خوارزم'} {course.totalLessons ? `· ${course.totalLessons} درسًا` : ''}
          </div>

          <div className="self-stretch text-sky-400 text-xs font-medium font-['Tajawal'] leading-4">
            {course.exactUnitLesson || course.lastLesson}
          </div>

          {course.nextLiveTime && !isCompleted && (
            <button
              type="button"
              onClick={() => onJoinLive ? onJoinLive(course) : undefined}
              className="self-stretch text-right text-orange-300 text-xs font-normal font-['Tajawal'] leading-4 inline-flex items-center gap-1.5 hover:underline cursor-pointer group mt-0.5"
            >
              <span className="size-2 rounded-full bg-orange-400 animate-pulse" />
              <span>جلسة مباشرة: {course.nextLiveTime}</span>
            </button>
          )}
        </div>

        {/* Child #3 in RTL: Thumbnail (renders on the FAR RIGHT) */}
        <div className="w-44 h-28 rounded-xl overflow-hidden shrink-0 border border-blue-900/60 relative group">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE LAYOUT (Vertical: Banner top, Progress & Action, Details below) */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col justify-start items-start gap-4 p-3.5">
        {/* Banner Thumbnail */}
        <div className="w-full h-32 rounded-xl overflow-hidden border border-blue-900/60 relative">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Action and Progress Bar */}
        <div className="self-stretch inline-flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={handleAction}
            className={`px-5 py-2 rounded-full inline-flex justify-center items-center text-xs font-bold font-['Tajawal'] transition-all duration-200 cursor-pointer active:scale-95 ${
              isCompleted
                ? 'bg-blue-950 outline outline-1 outline-offset-[-1px] outline-orange-300 text-orange-300 hover:bg-orange-300/10 shadow-[0_0_12px_rgba(229,182,92,0.25)]'
                : 'bg-sky-400 hover:bg-sky-300 text-slate-900 shadow-[0_0_12px_rgba(41,169,255,0.3)]'
            }`}
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

        {/* Course Details Block */}
        <div className="self-stretch flex flex-col justify-start items-start text-right gap-1.5">
          <h3
            onClick={() => onResume(course)}
            className="self-stretch text-white text-base font-bold font-['IBM_Plex_Sans_Arabic'] leading-5"
          >
            {course.title}
          </h3>

          <div className="self-stretch text-slate-400 text-xs font-normal font-['Tajawal'] leading-4">
            {course.instructor || 'أكاديمية خوارزم'} {course.totalLessons ? `· ${course.totalLessons} درسًا` : ''}
          </div>

          <div className="self-stretch text-sky-400 text-xs font-medium font-['Tajawal'] leading-4">
            {course.exactUnitLesson || course.lastLesson}
          </div>

          {course.nextLiveTime && !isCompleted && (
            <button
              type="button"
              onClick={() => onJoinLive ? onJoinLive(course) : undefined}
              className="self-stretch text-right text-orange-300 text-xs font-normal font-['Tajawal'] leading-4 inline-flex items-center gap-1.5 mt-0.5"
            >
              <span className="size-2 rounded-full bg-orange-400 animate-pulse" />
              <span>جلسة مباشرة: {course.nextLiveTime}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
