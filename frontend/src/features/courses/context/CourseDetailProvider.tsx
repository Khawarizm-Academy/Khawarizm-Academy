import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { fetchCourseDetail, getStartedLessonId } from '@/features/courses/data/courseFetchers';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseProgress, flattenLessons, seedCompletedLessonIds } from '@/features/courses/data/coursePath';
import type { CourseDetail } from '@/shared/types/entities';
import { CourseDetailContext } from '@/features/courses/context/courseDetailContext';
import type { CourseDetailContextValue } from '@/features/courses/context/courseDetailContext';
import { CourseToast } from '@/features/courses/components/overlays/CourseToast';

/** Owns landing state so both surfaces read one source; data comes from the shared detail cache. */
export const CourseDetailProvider: React.FC<{ slug: string; children: React.ReactNode }> = ({
  slug,
  children,
}) => {
  const navigate = useNavigate();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const fetcher = useCallback(() => fetchCourseDetail(slug), [slug]);
  const { data: course, isLoading } = useCachedData<CourseDetail | null>(
    ['course-detail', slug],
    fetcher,
    { keepPreviousData: true, staleTime: 10 * 60 * 1000, cacheTime: 30 * 60 * 1000 }
  );

  const startedLessonId = getStartedLessonId(slug);

  /** Seed-based resume progress, so "استمر" already shows a real percentage. */
  const progress = useMemo(() => {
    if (!course) return 0;
    const ordered = flattenLessons(course.modules);
    return courseProgress(ordered, seedCompletedLessonIds(course.modules, startedLessonId));
  }, [course, startedLessonId]);

  const showToast = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 3500);
  };

  const enroll = () => {
    if (isEnrolled) return;
    setIsEnrolled(true);
    showToast(courseCopy.landing.toastEnrolled);
    // Land exactly on the curriculum so lesson one is in view
    document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleFavorite = () => setIsFavorite((prev) => !prev);

  const continueLearning = () => navigate(`/courses/${slug}/learn`);

  const value: CourseDetailContextValue = {
    course,
    isLoading,
    isEnrolled,
    isFavorite,
    startedLessonId,
    progress,
    toastMessage,
    enroll,
    toggleFavorite,
    continueLearning,
    hideToast: () => setToastMessage(null),
  };

  return (
    <CourseDetailContext.Provider value={value}>
      {children}
      <CourseToast message={toastMessage} onClose={() => setToastMessage(null)} />
    </CourseDetailContext.Provider>
  );
};