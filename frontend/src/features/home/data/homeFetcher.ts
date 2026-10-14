import { apiGet } from '@/shared/lib/apiClient';
import type { Competition, Course, EventItem, QuickLink, Scholarship } from '@/shared/types/entities';

/** Every rail the home page renders, in one payload. */
export interface HomePayload {
  courses: Course[];
  scholarships: Scholarship[];
  competitionMobile: Competition;
  competitionDesktop: Competition;
  eventMobile: EventItem;
  eventDesktopFeatured: EventItem;
  eventDesktopWorkshop: EventItem;
  quickLinks: QuickLink[];
}

/** All home sections, served by GET /home. */
export function fetchHome(): Promise<HomePayload> {
  return apiGet<HomePayload>('/home');
}
