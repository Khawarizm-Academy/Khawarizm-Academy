import React from 'react';
import { UserRound } from 'lucide-react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';

/** Expanded instructor profile: avatar, credential and bio. */
export const InstructorCard: React.FC = () => {
  const { course } = useCourseDetail();
  if (!course) return null;

  return (
    <section className="course-section">
      <h2 className="course-section-title">{courseCopy.landing.instructorTitle}</h2>
      {course.instructorName ? (
        <div className="course-info-card animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="course-avatar">{course.instructorName.charAt(0)}</div>
            <div className="flex flex-col">
              <span className="course-instructor-name">{course.instructorName}</span>
              <span className="course-instructor-cred">{course.instructorCredential}</span>
            </div>
          </div>
          {course.instructorBio && <p className="course-instructor-bio">{course.instructorBio}</p>}
        </div>
      ) : (
        <CourseSectionEmpty copy={courseEmptyStates.instructor} icon={<UserRound size={18} />} />
      )}
    </section>
  );
};