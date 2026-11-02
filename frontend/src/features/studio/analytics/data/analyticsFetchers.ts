import { apiGet, buildQuery } from '@/shared/lib/apiClient';
import type { AnalyticsPayload, AnalyticsRange } from '@/features/studio/analytics/types';

export const fetchStudioAnalytics = (courseSlug: string | undefined, range: AnalyticsRange) => {
  const path = courseSlug
    ? `/studio/analytics/courses/${encodeURIComponent(courseSlug)}`
    : '/studio/analytics/overview';
  return apiGet<AnalyticsPayload>(`${path}${buildQuery({ range })}`);
};
