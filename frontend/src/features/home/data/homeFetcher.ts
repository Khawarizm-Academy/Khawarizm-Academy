import { apiGet } from '@/shared/lib/apiClient';
import type { Competition, Course, EventItem, QuickLink, Scholarship } from '@/shared/types/entities';

/** Every rail the home page renders, in one payload; singular rails are null when unseeded. */
export interface HomePayload {
  courses: Course[];
  scholarships: Scholarship[];
  competitionMobile: Competition | null;
  competitionDesktop: Competition | null;
  eventMobile: EventItem | null;
  eventDesktopFeatured: EventItem | null;
  eventDesktopWorkshop: EventItem | null;
  quickLinks: QuickLink[];
}

/** All home sections, served by GET /home. */
export function fetchHome(): Promise<HomePayload> {
  return apiGet<HomePayload>('/home');
}
