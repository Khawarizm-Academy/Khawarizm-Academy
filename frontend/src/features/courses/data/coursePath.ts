import type { CourseLesson, CourseLessonStatus, CourseModule } from '@/shared/types/entities';

/** Every lesson in module order, so path logic works on one flat list. */
export function flattenLessons(modules: CourseModule[] | undefined): CourseLesson[] {
  return (modules ?? []).flatMap((module) => module.lessons ?? []);
}

/** Lessons before the resume point count as completed when a course opens. */
export function seedCompletedLessonIds(modules: CourseModule[], startedLessonId: string): string[] {
  const ordered = flattenLessons(modules);
  const startIndex = ordered.findIndex((lesson) => lesson.id === startedLessonId);
  if (startIndex < 0) return [];
  return ordered.slice(0, startIndex).map((lesson) => lesson.id);
}

/** Path status of one lesson: completed, the active one, reachable, or locked. */
export function lessonStatus(
  lesson: CourseLesson,
  ordered: CourseLesson[],
  completedIds: string[],
  activeLessonId: string
): CourseLessonStatus {
  if (completedIds.includes(lesson.id)) return 'completed';
  if (lesson.id === activeLessonId) return 'active';
  return ordered.findIndex((item) => item.id === lesson.id) <
    ordered.findIndex((item) => item.id === activeLessonId)
    ? 'available'
    : 'locked';
}

/** Single unified course percentage: completed lessons over total lessons. */
export function courseProgress(ordered: CourseLesson[], completedIds: string[]): number {
  if (ordered.length === 0) return 0;
  return Math.round((completedIds.length / ordered.length) * 100);
}

/** True once every lesson is finished, which is what unlocks the exam. */
export function isExamUnlocked(ordered: CourseLesson[], completedIds: string[]): boolean {
  return ordered.length > 0 && ordered.every((lesson) => completedIds.includes(lesson.id));
}
