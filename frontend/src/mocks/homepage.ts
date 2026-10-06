import type { Course, EventItem, Scholarship, Competition } from '../shared/types/entities';
import mockJson from '../shared/json/mockHomepage.json';

/** Mock records live in JSON; this file only adds the types JSON cannot carry. */
export const mockCourses = mockJson.courses as Course[];
export const mockScholarships = mockJson.scholarships as Scholarship[];
export const mockCompetitionMobile = mockJson.competitionMobile as Competition;
export const mockCompetitionDesktop = mockJson.competitionDesktop as Competition;
export const mockEventMobile = mockJson.eventMobile as EventItem;
export const mockEventDesktopFeatured = mockJson.eventDesktopFeatured as EventItem;
export const mockEventDesktopWorkshop = mockJson.eventDesktopWorkshop as EventItem;
