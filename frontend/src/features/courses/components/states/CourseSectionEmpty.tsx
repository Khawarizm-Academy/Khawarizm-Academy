import React from 'react';
import type { CourseEmptyCopy } from '@/features/courses/data/courseStates';

interface CourseSectionEmptyProps {
  copy: CourseEmptyCopy;
  icon: React.ReactNode;
}

/** Compact inline empty state so an empty array never leaves blank space in a section. */
export const CourseSectionEmpty: React.FC<CourseSectionEmptyProps> = ({ copy, icon }) => {
  return (
    <div className="course-empty">
      <span className="course-empty-icon">{icon}</span>
      <span className="course-empty-title">{copy.title}</span>
      {copy.text && <span className="course-empty-text">{copy.text}</span>}
    </div>
  );
};
