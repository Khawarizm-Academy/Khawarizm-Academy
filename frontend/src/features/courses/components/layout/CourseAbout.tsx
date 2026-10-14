import React from 'react';
import { Info } from 'lucide-react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';

/** Expandable module accordion; every lesson stays visible even when locked. */
export const CourseAbout: React.FC = () => {
  const { course } = useCourseDetail();
  if (!course) return null;

  return (
    <section className="course-section">
      <h2 className="course-section-title">{courseCopy.landing.aboutTitle}</h2>
      {course.about ? (
        <div className="course-info-card animate-fade-in-up">
          <p className="course-instructor-bio">{course.about}</p>
        </div>
      ) : (
        <CourseSectionEmpty copy={courseEmptyStates.about} icon={<Info size={18} />} />
      )}
    </section>
  );
};
