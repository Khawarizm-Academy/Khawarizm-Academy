import { ApiError, apiGet } from '@/shared/lib/apiClient';
import type { CatalogItem, CourseDetail, CourseProblem } from '@/shared/types/entities';

/** One course's full landing picture, or null when the slug is unknown. */
export async function fetchCourseDetail(slug: string): Promise<CourseDetail | null> {
  try {
    return await apiGet<CourseDetail>(`/courses/${slug}`);
  } catch (error) {
    // A missing course is a null result for the UI, not a hard error.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Related course cards for the landing rail, same course grammar as the catalog. */
export async function fetchRelatedCourses(ids: string[]): Promise<CatalogItem[]> {
  const data = await apiGet<{ items: CatalogItem[] }>(`/catalog?type=courses&ids=${ids.join(',')}`);
  return data.items;
}

/** The reusable practice set shown under a lesson's "حلّ المسائل" tab. */
export async function fetchCourseProblems(): Promise<CourseProblem[]> {
  return apiGet<CourseProblem[]>('/problems');
}