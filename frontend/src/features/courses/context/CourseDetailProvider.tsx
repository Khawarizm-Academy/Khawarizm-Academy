import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { dataCacheManager } from '@/shared/lib/cacheManager';
import {
  enrollCourse,
  fetchCourseDetail,
  toggleCourseFavorite,
} from '@/features/courses/data/courseFetchers';
import { fetchEnrolledCourses, fetchFavoriteCourses } from '@/features/dashboard/data/dashboardFetchers';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseProgress, flattenLessons, seedCompletedLessonIds } from '@/features/courses/data/coursePath';
import type { CourseDetail } from '@/shared/types/entities';
import type { EnrolledCourse, FavoriteCourseItem } from '@/features/dashboard/types';
import { CourseDetailContext } from '@/features/courses/context/courseDetailContext';
import type { CourseDetailContextValue } from '@/features/courses/context/courseDetailContext';
import { CourseToast } from '@/features/courses/components/overlays/CourseToast';

/** Owns landing state so both surfaces read one source; data comes from the shared detail cache. */
export const CourseDetailProvider: React.FC<{ slug: string; children: React.ReactNode }> = ({
  slug,
  children,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // The API is the source of truth; a local override covers the optimistic click.
  const [enrolledOverride, setEnrolledOverride] = useState<boolean | null>(null);
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const fetcher = useCallback(() => fetchCourseDetail(slug), [slug]);
  const { data: course, isLoading } = useCachedData<CourseDetail | null>(
    ['course-detail', slug],
    fetcher,
    { keepPreviousData: true, staleTime: 10 * 60 * 1000, cacheTime: 30 * 60 * 1000 }
  );

  // Enrollment and favorites are gated: only a signed-in reader has these rows.
  const enrolledFetcher = useCallback(() => fetchEnrolledCourses(), []);
  const { data: enrolledCourses } = useCachedData<EnrolledCourse[]>(
    ['dashboard', 'courses-list'],
    enrolledFetcher,
    { enabled: Boolean(user), initialData: [] }
  );

  const favoritesFetcher = useCallback(() => fetchFavoriteCourses(), []);
  const { data: favoriteCourses } = useCachedData<FavoriteCourseItem[]>(
    ['dashboard', 'favorite-courses'],
    favoritesFetcher,
    { enabled: Boolean(user), initialData: [] }
  );

  const isEnrolled = enrolledOverride ?? enrolledCourses.some((row) => row.id === slug);
  const isFavorite = favoriteOverride ?? favoriteCourses.some((row) => row.id === slug);

  // The fetched detail carries the resume point for returning learners.
  const startedLessonId = course?.startedLessonId ?? '';

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
    setEnrolledOverride(true);
    showToast(courseCopy.landing.toastEnrolled);
    // Fire-and-forget: the optimistic state is what the reader sees immediately.
    void enrollCourse(slug)
      .then(() => dataCacheManager.invalidate(['dashboard', 'courses-list']))
      .catch(() => setEnrolledOverride(null));
    // Land exactly on the curriculum so lesson one is in view
    document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleFavorite = () => {
    const next = !isFavorite;
    setFavoriteOverride(next);
    void toggleCourseFavorite(slug)
      .then((result) => {
        // A visitor cannot keep a favorite; point them at sign-in instead.
        if (result.requiresAuth) {
          setFavoriteOverride(null);
          showToast(courseCopy.landing.toastSignIn);
          return;
        }
        setFavoriteOverride(result.favorited);
        showToast(result.favorited ? courseCopy.landing.toastFavoriteSaved : courseCopy.landing.toastFavoriteRemoved);
        dataCacheManager.invalidate(['dashboard', 'favorite-courses']);
      })
      .catch(() => setFavoriteOverride(null));
  };

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