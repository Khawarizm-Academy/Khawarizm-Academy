import { ApiError, apiGet } from '@/shared/lib/apiClient';
import type { CatalogItem, CourseDetail, CourseProblem } from '@/shared/types/entities';

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

/** Related course cards for the landing rail, same course grammar as the catalog. */
export async function fetchRelatedCourses(ids: string[]): Promise<CatalogItem[]> {
  const data = await apiGet<{ items: CatalogItem[] }>(`/catalog?type=courses&ids=${ids.join(',')}`);
  return orEmpty(data?.items);
}

/** The reusable practice set shown under a lesson's "حلّ المسائل" tab. */
export async function fetchCourseProblems(): Promise<CourseProblem[]> {
  return orEmpty(await apiGet<CourseProblem[]>('/problems'));
}