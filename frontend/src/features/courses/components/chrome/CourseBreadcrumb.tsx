import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import { courseCopy } from '@/features/courses/data/courseCopy';
import type { CourseDetail } from '@/shared/types/entities';

interface CourseBreadcrumbProps {
  course: CourseDetail;
}

/** Main > Courses > Category > Title, with forward separators in RTL. */
export const CourseBreadcrumb: React.FC<CourseBreadcrumbProps> = ({ course }) => {
  const navigate = useNavigate();

  const items = [
    { label: courseCopy.landing.breadcrumbRoot, path: NAV_TARGETS.home },
    { label: courseCopy.landing.breadcrumbCourses, path: NAV_TARGETS.courses },
    { label: course.category, path: NAV_TARGETS.courses },
  ];

  return (
    <nav className="course-breadcrumb animate-fade-in-up" aria-label="breadcrumb">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(item.path)} className="course-breadcrumb-link">
            {item.label}
          </button>
          <ChevronLeft size={12} className="text-slate-500" />
        </span>
      ))}
      <span className="text-white font-semibold truncate max-w-[240px]">{course.title}</span>
    </nav>
  );
};