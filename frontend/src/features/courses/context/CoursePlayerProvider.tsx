import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useCachedData } from '@/shared/hooks/useCachedData';
import {
  fetchCourseDetail,
  fetchCourseProblems,
  getStartedLessonId,
} from '@/features/courses/data/courseFetchers';
import { courseCopy } from '@/features/courses/data/courseCopy';
import {
  courseProgress,
  flattenLessons,
  isExamUnlocked,
  seedCompletedLessonIds,
} from '@/features/courses/data/coursePath';
import type { CourseDetail, CourseProblem } from '@/shared/types/entities';
import type { CourseTab } from '@/features/courses/types';
import { CoursePlayerContext } from '@/features/courses/context/coursePlayerContext';
import type { CoursePlayerContextValue } from '@/features/courses/context/coursePlayerContext';
import { CourseToast } from '@/features/courses/components/overlays/CourseToast';

/** Owns the study-session state; lesson data shares the same detail cache as the landing. */
export const CoursePlayerProvider: React.FC<{ slug: string; children: React.ReactNode }> = ({
  slug,
  children,
}) => {
  const [activeTab, setActiveTab] = useState<CourseTab>('lesson');
  const [activeLessonId, setActiveLessonId] = useState('');
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [prevCourseId, setPrevCourseId] = useState('');
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const fetcher = useCallback(() => fetchCourseDetail(slug), [slug]);
  const { data: course, isLoading } = useCachedData<CourseDetail | null>(
    ['course-detail', slug],
    fetcher,
    { keepPreviousData: true, staleTime: 10 * 60 * 1000, cacheTime: 30 * 60 * 1000 }
  );

  const problemsFetcher = useCallback(() => fetchCourseProblems(), []);
  const { data: problems } = useCachedData<CourseProblem[]>(['course-problems'], problemsFetcher, {
    staleTime: 30 * 60 * 1000,
  });

  const startedLessonId = getStartedLessonId(slug);
  const ordered = useMemo(() => (course ? flattenLessons(course.modules) : []), [course]);

  // Seed the resume point the moment the detail arrives. Adjusting state during
  // render (guarded by the previous course id) is React's documented pattern for
  // resetting state when derived data changes — no effect round-trip needed.
  if (course && (prevCourseId !== course.id || activeLessonId === '')) {
    setPrevCourseId(course.id);
    setCompletedIds(seedCompletedLessonIds(course.modules, startedLessonId));
    setActiveLessonId(startedLessonId || ordered[0]?.id || '');
  }

  const showToast = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 3800);
  };

  const selectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setActiveTab('lesson');
    setIsSyllabusOpen(false);
  };

  const completeLesson = () => {
    if (!activeLessonId) return;
    setCompletedIds((prev) => (prev.includes(activeLessonId) ? prev : [...prev, activeLessonId]));
    // Auto-advance prompt: finishing a lesson points at its practice set.
    setActiveTab('problems');
    showToast(courseCopy.player.lessonDoneToast);
  };

  const activeLesson = ordered.find((lesson) => lesson.id === activeLessonId) ?? null;
  const progress = courseProgress(ordered, completedIds);
  const examUnlocked = isExamUnlocked(ordered, completedIds);

  const value: CoursePlayerContextValue = {
    course,
    isLoading,
    activeLesson,
    activeLessonId,
    completedIds,
    activeTab,
    isSyllabusOpen,
    problems: problems ?? [],
    progress,
    isExamUnlocked: examUnlocked,
    toastMessage,
    selectLesson,
    selectTab: setActiveTab,
    completeLesson,
    openSyllabus: () => setIsSyllabusOpen(true),
    closeSyllabus: () => setIsSyllabusOpen(false),
    hideToast: () => setToastMessage(null),
  };

  return (
    <CoursePlayerContext.Provider value={value}>
      {children}
      <CourseToast message={toastMessage} onClose={() => setToastMessage(null)} />
    </CoursePlayerContext.Provider>
  );
};