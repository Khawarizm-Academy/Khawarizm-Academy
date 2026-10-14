import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { useNavigate, useParams } from '@/app/routerContext';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { flattenLessons, lessonStatus, seedCompletedLessonIds } from '@/features/courses/data/coursePath';
import { CurriculumModuleCard } from '@/features/courses/components/cards/CurriculumModuleCard';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';

/** Full curriculum accordion; locked lessons stay visible, never hidden. */
export const CourseCurriculum: React.FC = () => {
  const { course, isEnrolled, startedLessonId, enroll } = useCourseDetail();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // First module opens by default so the syllabus preview never looks empty
  const [openModuleIds, setOpenModuleIds] = useState<string[]>(() => {
    const firstModuleId = course?.modules?.[0]?.id;
    return firstModuleId ? [firstModuleId] : [];
  });

  if (!course) return null;

  const ordered = flattenLessons(course.modules);
  const completedIds = isEnrolled ? seedCompletedLessonIds(course.modules, startedLessonId) : [];
  const activeLessonId = isEnrolled ? startedLessonId : '';

  const getStatus = (lessonId: string) => {
    const lesson = ordered.find((item) => item.id === lessonId);
    if (!lesson) return 'locked';
    return lessonStatus(lesson, ordered, completedIds, activeLessonId);
  };

  const toggleModule = (moduleId: string) => {
    setOpenModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const selectLesson = (lessonId: string) => {
    // Guests enroll first; enrolled students jump straight into the player.
    if (!isEnrolled) {
      enroll();
      return;
    }
    if (getStatus(lessonId) === 'locked') return;
    navigate(`/courses/${slug}/learn`);
  };

  return (
    <section id="curriculum" className="course-section">
      <h2 className="course-section-title">{courseCopy.landing.curriculumTitle}</h2>
      {course.modules.length === 0 ? (
        <CourseSectionEmpty copy={courseEmptyStates.curriculum} icon={<FolderOpen size={18} />} />
      ) : (
        <div className="course-accordion">
          {course.modules.map((module, idx) => (
            <CurriculumModuleCard
              key={module.id}
              module={module}
              index={idx + 1}
              isOpen={openModuleIds.includes(module.id)}
              onToggle={() => toggleModule(module.id)}
              getStatus={getStatus}
              onSelectLesson={selectLesson}
            />
          ))}
        </div>
      )}
    </section>
  );
};