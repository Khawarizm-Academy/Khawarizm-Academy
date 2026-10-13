import { apiGet, isMockApi } from '@/shared/lib/apiClient';
import {
  mockCompetitionDesktop,
  mockCompetitionMobile,
  mockCourses,
  mockEventDesktopFeatured,
  mockEventDesktopWorkshop,
  mockEventMobile,
  mockScholarships,
  quickLinks,
  type QuickLink,
} from '@/shared/mocks/homepage';
import type { Competition, Course, EventItem, Scholarship } from '@/shared/types/entities';

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

/** Mock-mode home payload, reused as the live fetch's initial data. */
export const HOME_MOCK_PAYLOAD: HomePayload = {
  courses: mockCourses,
  scholarships: mockScholarships,
  competitionMobile: mockCompetitionMobile,
  competitionDesktop: mockCompetitionDesktop,
  eventMobile: mockEventMobile,
  eventDesktopFeatured: mockEventDesktopFeatured,
  eventDesktopWorkshop: mockEventDesktopWorkshop,
  quickLinks,
};

/** All home sections; live mode pulls them from GET /home. */
export async function fetchHome(): Promise<HomePayload> {
  if (!isMockApi) return apiGet<HomePayload>('/home');
  return HOME_MOCK_PAYLOAD;
}
