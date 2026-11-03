import { apiGet, apiPatch, apiPost, buildQuery } from '@/shared/lib/apiClient';
import type { CourseReview, CourseReviewPage, ReviewSort, StudioReviewPage } from '@/features/reviews/types';

export const fetchCourseReviews = (slug: string, sort: ReviewSort = 'newest', page = 1): Promise<CourseReviewPage> =>
  apiGet<CourseReviewPage>(`/courses/${encodeURIComponent(slug)}/reviews${buildQuery({ sort, page, pageSize: 10 })}`);

export const createCourseReview = (
  slug: string,
  payload: { rating: number; title: string; body: string },
): Promise<CourseReview> => apiPost<CourseReview>(`/courses/${encodeURIComponent(slug)}/reviews/write`, payload);

export const updateCourseReview = (
  slug: string,
  reviewId: string,
  payload: Partial<{ rating: number; title: string; body: string }>,
): Promise<CourseReview> => apiPatch<CourseReview>(`/courses/${encodeURIComponent(slug)}/reviews/${reviewId}`, payload);

export const replyToCourseReview = (slug: string, reviewId: string, body: string): Promise<CourseReview> =>
  apiPost<CourseReview>(`/courses/${encodeURIComponent(slug)}/reviews/${reviewId}/reply`, { body });

export const fetchStudioReviews = (page = 1): Promise<StudioReviewPage> =>
  apiGet<StudioReviewPage>(`/studio/reviews${buildQuery({ page, pageSize: 20 })}`);
