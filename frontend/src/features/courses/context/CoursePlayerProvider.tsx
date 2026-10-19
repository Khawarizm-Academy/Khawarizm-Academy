import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useCachedData } from '@/shared/hooks/useCachedData';
import {
  fetchCourseDetail,
  fetchCourseProblems,
  syncCourseProgress,
} from '@/features/courses/data/courseFetchers';
import { dataCacheManager } from '@/shared/lib/cacheManager';
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

  const problemsFetcher = useCallback(() => fetchCourseProblems(slug), [slug]);
  const { data: problems } = useCachedData<CourseProblem[]>(['course-problems', slug], problemsFetcher, {
    staleTime: 30 * 60 * 1000,
  });
  const problemList = useMemo(() => problems ?? [], [problems]);

  // The fetched detail carries the resume point for returning learners.
  const startedLessonId = course?.startedLessonId ?? '';
  const ordered = useMemo(() => (course ? flattenLessons(course.modules) : []), [course]);

  // Seed the resume point the moment the detail arrives. Adjusting state during
  // render (guarded by the previous course id) is React's documented pattern for
  // resetting state when derived data changes — no effect round-trip needed.
  if (course && (prevCourseId !== course.id || activeLessonId === '')) {
    setPrevCourseId(course.id);
    setCompletedIds(seedCompletedLessonIds(course.modules, startedLessonId));
    setActiveLessonId(startedLessonId || ordered[0]?.id || '');
  }

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 3800);
  }, []);

  const selectLesson = useCallback((lessonId: string) => {
    setActiveLessonId(lessonId);
    setActiveTab('lesson');
    setIsSyllabusOpen(false);
  }, []);

  const completeLesson = useCallback(() => {
    if (!activeLessonId) return;
    const next = completedIds.includes(activeLessonId) ? completedIds : [...completedIds, activeLessonId];
    setCompletedIds(next);
    // Persist the session so the dashboard resumes from this lesson.
    void syncCourseProgress(slug, {
      progress: courseProgress(ordered, next),
      completedLessonIds: next,
      lastLesson: activeLessonId,
      isCompleted: ordered.length > 0 && next.length === ordered.length,
    })
      .then(() => dataCacheManager.invalidate(['dashboard', 'courses-list']))
      .catch(() => undefined);
    // Auto-advance prompt: finishing a lesson points at its practice set.
    setActiveTab('problems');
    showToast(courseCopy.player.lessonDoneToast);
  }, [activeLessonId, completedIds, ordered, slug, showToast]);

  const openSyllabus = useCallback(() => setIsSyllabusOpen(true), []);
  const closeSyllabus = useCallback(() => setIsSyllabusOpen(false), []);

  const activeLesson = ordered.find((lesson) => lesson.id === activeLessonId) ?? null;
  const progress = courseProgress(ordered, completedIds);
  const examUnlocked = isExamUnlocked(ordered, completedIds);

  const value = useMemo<CoursePlayerContextValue>(
    () => ({
      course,
      isLoading,
      activeLesson,
      activeLessonId,
      completedIds,
      activeTab,
      isSyllabusOpen,
      problems: problemList,
      progress,
      isExamUnlocked: examUnlocked,
      selectLesson,
      selectTab: setActiveTab,
      completeLesson,
      openSyllabus,
      closeSyllabus,
    }),
    [
      course,
      isLoading,
      activeLesson,
      activeLessonId,
      completedIds,
      activeTab,
      isSyllabusOpen,
      problemList,
      progress,
      examUnlocked,
      selectLesson,
      completeLesson,
      openSyllabus,
      closeSyllabus,
    ]
  );

  return (
    <CoursePlayerContext.Provider value={value}>
      {children}
      <CourseToast message={toastMessage} onClose={() => setToastMessage(null)} />
    </CoursePlayerContext.Provider>
  );
};