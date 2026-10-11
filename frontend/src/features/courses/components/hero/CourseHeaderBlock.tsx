import React from 'react';
import { Clock, PlayCircle, Star, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { courseCopy } from '@/features/courses/data/courseCopy';
import type { CourseDetail } from '@/shared/types/entities';

interface CourseHeaderBlockProps {
  course: CourseDetail;
}

/** Cover, title, value statement, instructor mini-profile and the stat strip. */
export const CourseHeaderBlock: React.FC<CourseHeaderBlockProps> = ({ course }) => {
  const L = courseCopy.landing;

  const stats: Array<{ icon: LucideIcon; label: string; value: string }> = [
    { icon: Star, label: L.metaRating, value: `${course.rating.toFixed(1)} / 5` },
    { icon: Users, label: L.metaEnrolled, value: course.enrolledCount.toLocaleString('ar-EG') },
    { icon: Clock, label: L.metaDuration, value: course.duration },
    { icon: PlayCircle, label: L.metaLessons, value: `${course.lessonsCount}` },
  ];

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-in-up">
      <div className="course-cover group">
        <img src={course.thumbnailUrl} alt={course.title} className="course-cover-img" loading="lazy" />
        <div className="course-cover-shade" />
        <span className="course-cover-badge">{course.category}</span>
      </div>

      <div className="flex flex-col gap-2.5">
        <h1 className="course-title">{course.title}</h1>
        <p className="course-tagline">{course.tagline}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="course-avatar">{course.instructorName.charAt(0)}</div>
        <div className="flex flex-col">
          <span className="course-instructor-name">{course.instructorName}</span>
          <span className="course-instructor-cred">{course.instructorCredential}</span>
        </div>
      </div>

      <div className="course-stat-row">
        {stats.map((stat) => (
          <div key={stat.label} className="course-stat">
            <stat.icon size={15} className="text-blue-400" />
            <span className="course-stat-value">{stat.value}</span>
            <span className="course-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="course-badge-row">
        <span className="badge-pill bg-navy-900/70 border border-navy-600 text-slate-200">{course.levelLabel}</span>
        <span className="badge-pill bg-navy-900/70 border border-navy-600 text-slate-200">{course.languageLabel}</span>
        <span className="badge-pill bg-navy-900/70 border border-navy-600 text-slate-200">{course.category}</span>
      </div>
    </div>
  );
};