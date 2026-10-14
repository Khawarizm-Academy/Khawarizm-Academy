import React from 'react';
import { ListTree } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { flattenLessons, lessonStatus } from '@/features/courses/data/coursePath';
import { PathLessonRow } from '@/features/courses/components/cards/PathLessonRow';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';

/** Module tree with status-aware lesson rows; shared by sidebar and drawer. */
export const CoursePathModules: React.FC = () => {
  const { course, activeLessonId, completedIds, selectLesson } = useCoursePlayer();
  if (!course) return null;

  if (course.modules.length === 0) {
    return <CourseSectionEmpty copy={courseEmptyStates.path} icon={<ListTree size={18} />} />;
  }

  const ordered = flattenLessons(course.modules);

  return (
    <div className="flex flex-col gap-4">
      {course.modules.map((module) => (
        <div key={module.id} className="player-path-module">
          <span className="player-path-module-title">{module.title}</span>
          <div className="flex flex-col gap-1">
            {module.lessons.length === 0 && (
              <p className="course-empty-row">{courseEmptyStates.module.title}</p>
            )}
            {module.lessons.map((lesson, lessonIndex) => (
              <PathLessonRow
                key={lesson.id}
                lesson={lesson}
                status={lessonStatus(lesson, ordered, completedIds, activeLessonId)}
                onSelect={selectLesson}
                index={lessonIndex}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};