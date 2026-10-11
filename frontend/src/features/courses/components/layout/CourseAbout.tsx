import React from 'react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';

/** Expandable module accordion; every lesson stays visible even when locked. */
export const CourseAbout: React.FC = () => {
  const { course } = useCourseDetail();
  if (!course) return null;

  return (
    <section className="course-section">
      <h2 className="course-section-title">{courseCopy.landing.aboutTitle}</h2>
      <div className="course-info-card animate-fade-in-up">
        <p className="course-instructor-bio">{course.about}</p>
      </div>
    </section>
  );
};