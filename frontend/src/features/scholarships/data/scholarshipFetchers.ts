import { ApiError, apiGet } from '@/shared/lib/apiClient';
import type { CatalogItem } from '@/shared/types/entities';

/** One scholarship's detail, or null when the slug is unknown. */
export async function fetchScholarshipDetail(slug: string): Promise<CatalogItem | null> {
  try {
    return await apiGet<CatalogItem>(`/scholarships/${slug}`);
  } catch (error) {
    // A missing scholarship is a "not available" panel, not a hard error.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
