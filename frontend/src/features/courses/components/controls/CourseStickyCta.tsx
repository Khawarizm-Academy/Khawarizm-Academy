import React from 'react';
import { CoursePrimaryCta } from '@/features/courses/components/controls/CoursePrimaryCta';

/** Mobile-only bar pinned above the bottom nav; reuses the one primary CTA. */
export const CourseStickyCta: React.FC = () => (
  <div className="course-sticky-cta lg:hidden">
    <CoursePrimaryCta />
  </div>
);