import { apiGet } from '@/shared/lib/apiClient';
import type { EventItem } from '@/shared/types/entities';

/** A sparse API response still yields an array, so the empty state can render. */
export async function fetchEvents(): Promise<EventItem[]> {
  const events = await apiGet<EventItem[]>('/events');
  return events ?? [];
}
