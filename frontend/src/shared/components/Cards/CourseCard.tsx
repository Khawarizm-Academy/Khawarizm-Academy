import React from 'react';
import { ArrowLeft, Clock, Users } from 'lucide-react';
import type { Course } from '../../types/entities';
import { CourseThumbnail } from '../Artwork/BrandVisuals';
import { convertKeyToAr, toArabic } from '../../lib/localization';

interface CourseCardProps {
  course: Course;
  layout?: 'desktop' | 'mobile';
  onDetails?: (course: Course) => void;
}

/** Course status code to its capsule tone. Unknown codes fall back to closed. */
const COURSE_STATUS_TONE: Record<string, string> = {
  available: 'card-status card-status-open',
  'متاح': 'card-status card-status-open',
};

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  layout = 'desktop',
  onDetails,
}) => {
  const isMobile = layout === 'mobile';
  const statusTone = COURSE_STATUS_TONE[course.status ?? ''] ?? 'card-status card-status-closed';

  return (
    <div
      className={`group relative card-interactive-blue ${isMobile ? 'rail-card-size' : 'w-full h-full'}`}
    >
      <div>
        {/* Media Thumbnail Container with Smooth Scale on Card Hover */}
        <div className="card-media-box">
          <CourseThumbnail type={course.thumbnailType} />

          {/* Level / Category Badge (Top Right in RTL) */}
          <div className="absolute top-2 right-2 badge-blue">
            {convertKeyToAr(course.category || course.level, 'courseLevels')}
          </div>

          {/* 2px Tech-Blue Accent Bar at Bottom of Thumbnail that blooms softly on hover */}
          <div className="card-accent-blue" />
        </div>

        {/* Content Body */}
        <div className="p-4">
          <h4 className="card-title">{course.title}</h4>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="card-meta-row mb-3">
          {/* Duration with Clock Icon */}
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            <span>{course.duration}</span>
          </div>

          {/* Students Count or Status */}
          {course.studentsCount ? (
            <span className="text-slate-400 flex items-center gap-1">
              <Users size={13} />
              {course.studentsCount}
            </span>
          ) : (
            <span className={statusTone}>
              {convertKeyToAr(course.status || 'available', 'courseStatus')}
            </span>
          )}
        </div>

        {/* Action Button: Balanced, accessible touch target with clear typography */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDetails?.(course);
          }}
          className="w-full btn-outline-blue text-[13px] sm:text-sm"
        >
          <span>{toArabic('actions', 'course_details')}</span>
          <ArrowLeft size={14} className="arrow-shift" />
        </button>
      </div>
    </div>
  );
};
