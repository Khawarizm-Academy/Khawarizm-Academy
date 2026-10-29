import { ApiError, apiGet, apiPost } from '@/shared/lib/apiClient';
import type { CatalogItem, CourseCertificate, CourseDetail, CourseProblem } from '@/shared/types/entities';

/** A missing array becomes empty; no section ever maps over undefined. */
function orEmpty<T>(value: T[] | undefined): T[] {
  return value ?? [];
}

/** A sparse API response still yields arrays, so per-section empty states can render. */
function normalizeCourseDetail(course: CourseDetail): CourseDetail {
  return {
    ...course,
    outcomes: orEmpty(course.outcomes),
    modules: orEmpty(course.modules).map((module) => ({ ...module, lessons: orEmpty(module.lessons) })),
    liveSessions: orEmpty(course.liveSessions),
    relatedIds: orEmpty(course.relatedIds),
  };
}

/** One course's full landing picture, or null when the slug is unknown. */
export async function fetchCourseDetail(slug: string): Promise<CourseDetail | null> {
  try {
    return normalizeCourseDetail(await apiGet<CourseDetail>(`/courses/${slug}`));
  } catch (error) {
    // A missing course is a null result for the UI, not a hard error.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Related course cards the API computes from this course's own related list. */
export async function fetchRelatedCourses(slug: string): Promise<CatalogItem[]> {
  return orEmpty(await apiGet<{ items: CatalogItem[] }>(`/courses/${slug}/related`).then((data) => data.items));
}

/** The course's practice set shown under a lesson's "حلّ المسائل" tab. */
export async function fetchCourseProblems(slug: string): Promise<CourseProblem[]> {
  return orEmpty(await apiGet<{ items: CourseProblem[] }>(`/courses/${slug}/problems`).then((data) => data.items));
}

/** Enroll the learner; the API still acknowledges a visitor so the CTA never dead-ends. */
export async function enrollCourse(slug: string): Promise<boolean> {
  const data = await apiPost<{ enrolled: boolean }>(`/courses/${slug}/enroll`);
  return data.enrolled;
}

/** Toggle this course in the learner's favorites; the API flags when a session is required. */
export async function toggleCourseFavorite(slug: string): Promise<{ favorited: boolean; requiresAuth: boolean }> {
  const data = await apiPost<{ favorited: boolean; requiresAuth?: boolean }>(`/courses/${slug}/favorite`);
  return { favorited: data.favorited, requiresAuth: data.requiresAuth ?? false };
}

/** Payload the player syncs so the dashboard can resume the lesson later. */
export interface ProgressSync {
  progress: number;
  completedLessonIds: string[];
  lastLesson: string;
  isCompleted: boolean;
}

/** Persist one study-session sync for the signed-in learner. */
export async function syncCourseProgress(slug: string, payload: ProgressSync): Promise<void> {
  await apiPost(`/courses/${slug}/progress`, payload);
}

/** Certificate metadata for a completed course, or null when the slug is unknown. */
export async function fetchCourseCertificate(slug: string): Promise<CourseCertificate | null> {
  try {
    return await apiGet<CourseCertificate>(`/courses/${slug}/certificate`);
  } catch (error) {
    // A missing certificate is a fallback render, not a hard error.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
