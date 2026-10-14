import React from 'react';
import { Check, ListChecks } from 'lucide-react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';

/** The "what you will learn" bullet strip. */
export const CourseOutcomes: React.FC = () => {
  const { course } = useCourseDetail();
  if (!course) return null;

  return (
    <section className="course-section">
      <h2 className="course-section-title">{courseCopy.landing.outcomesTitle}</h2>
      {course.outcomes.length === 0 ? (
        <CourseSectionEmpty copy={courseEmptyStates.outcomes} icon={<ListChecks size={18} />} />
      ) : (
        <ul className="course-outcome-list">
          {course.outcomes.map((outcome, idx) => (
            <li key={outcome} className="course-outcome-item animate-pop-in" style={{ animationDelay: `${idx * 60}ms` }}>
              <span className="course-outcome-icon">
                <Check size={14} />
              </span>
              <span className="course-outcome-text">{outcome}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};