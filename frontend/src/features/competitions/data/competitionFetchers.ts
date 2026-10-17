import { apiGet } from '@/shared/lib/apiClient';
import type { Competition } from '@/shared/types/entities';

/** A sparse API response still yields an array, so the empty state can render. */
export async function fetchCompetitions(): Promise<Competition[]> {
  const competitions = await apiGet<Competition[]>('/competitions');
  return competitions ?? [];
}
