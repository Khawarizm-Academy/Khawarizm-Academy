import { ApiError, apiGet, apiPost } from '@/shared/lib/apiClient';
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

/** Submit an application for the signed-in learner; the API also acknowledges a visitor. */
export async function applyToScholarship(slug: string): Promise<boolean> {
  const data = await apiPost<{ applied: boolean }>(`/scholarships/${slug}/apply`);
  return data.applied;
}

/** Toggle this scholarship in the learner's saved list. */
export async function saveScholarship(slug: string): Promise<boolean> {
  const data = await apiPost<{ saved: boolean }>(`/scholarships/${slug}/save`);
  return data.saved;
}
