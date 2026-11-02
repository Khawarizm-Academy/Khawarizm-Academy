import React from 'react';
import { UserRound } from 'lucide-react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';
import type { CourseInstructor, CourseLandingCourse } from '@/features/courses/types';

/** Expanded instructor profile: avatar, credential and bio. */
export const InstructorCard: React.FC = () => {
  const { course } = useCourseDetail();
  if (!course) return null;

  const landingCourse = course as CourseLandingCourse;
  const publicInstructors = landingCourse.instructors ?? [];
  const instructors: CourseInstructor[] = publicInstructors.length > 0
    ? publicInstructors
    : course.instructorName
      ? [{
          id: 'legacy-instructor',
          name: course.instructorName,
          headline: course.instructorCredential,
          avatarUrl: '',
        }]
      : [];

  return (
    <section className="course-section">
      <h2 className="course-section-title">{courseCopy.landing.instructorTitle}</h2>
      {instructors.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {instructors.map((instructor) => (
            <div key={instructor.id} className="course-info-card animate-fade-in-up">
              <div className="flex items-center gap-3">
                {instructor.avatarUrl ? (
                  <img
                    src={instructor.avatarUrl}
                    alt=""
                    className="course-avatar object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="course-avatar">{instructor.name.charAt(0)}</div>
                )}
                <div className="flex flex-col">
                  <span className="course-instructor-name">{instructor.name}</span>
                  <span className="course-instructor-cred">{instructor.headline}</span>
                </div>
              </div>
              {publicInstructors.length === 0 && landingCourse.instructorBio && (
                <p className="course-instructor-bio">{landingCourse.instructorBio}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <CourseSectionEmpty copy={courseEmptyStates.instructor} icon={<UserRound size={18} />} />
      )}
    </section>
  );
};
