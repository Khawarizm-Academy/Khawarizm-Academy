import type {
  EnrolledCourse,
  LiveSessionInfo,
  DashboardStats,
  UpcomingEvent,
  DashboardNotification,
  SavedScholarshipItem,
  FavoriteCourseItem,
  CompetitionItem,
  CertificateItem,
  NotificationItemData,
} from '@/features/dashboard/types';
import {
  mockEnrolledCourses,
  mockPriorityContinueCourse,
  mockImminentLiveSession,
  mockDashboardStats,
  mockUpcomingEvents,
  mockNotifications,
  mockDashboardNotifications,
  mockSavedScholarships,
  mockFavoriteCourses,
  mockCompetitions,
  mockCertificates,
} from '@/shared/mocks/dashboard';
import { apiGet, isMockApi } from '@/shared/lib/apiClient';

const COLD_LATENCY_MS = 400;

function coldDelay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), COLD_LATENCY_MS));
}

/** The priority card keeps the mock seed's inferred shape. */
type PriorityContinue = typeof mockPriorityContinueCourse;

/** Shape of GET /dashboard (the summary endpoint). */
interface DashboardSummary {
  stats: DashboardStats | null;
  priorityContinue: PriorityContinue | null;
  imminentLiveSession: LiveSessionInfo | null;
  upcomingEvents: UpcomingEvent[];
}

const fetchSummary = () => apiGet<DashboardSummary>('/dashboard');

export const fetchEnrolledCourses = (): Promise<EnrolledCourse[]> =>
  isMockApi ? coldDelay(mockEnrolledCourses) : apiGet<EnrolledCourse[]>('/dashboard/enrolled');

export const fetchPriorityContinue = async (): Promise<PriorityContinue[]> => {
  if (isMockApi) return coldDelay([mockPriorityContinueCourse]);
  const summary = await fetchSummary();
  return summary.priorityContinue ? [summary.priorityContinue] : [];
};

export const fetchImminentLiveSession = async (): Promise<LiveSessionInfo> => {
  if (isMockApi) return coldDelay(mockImminentLiveSession);
  const summary = await fetchSummary();
  return summary.imminentLiveSession ?? mockImminentLiveSession;
};

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  if (isMockApi) return coldDelay(mockDashboardStats);
  const summary = await fetchSummary();
  return summary.stats ?? mockDashboardStats;
};

export const fetchUpcomingEvents = async (): Promise<UpcomingEvent[]> => {
  if (isMockApi) return coldDelay(mockUpcomingEvents);
  const summary = await fetchSummary();
  return summary.upcomingEvents;
};

export const fetchSavedScholarships = async (): Promise<SavedScholarshipItem[]> => {
  if (isMockApi) return coldDelay(mockSavedScholarships);
  const data = await apiGet<{ scholarships: SavedScholarshipItem[] }>('/dashboard/saved');
  return data.scholarships;
};

export const fetchFavoriteCourses = async (): Promise<FavoriteCourseItem[]> => {
  if (isMockApi) return coldDelay(mockFavoriteCourses);
  const data = await apiGet<{ courses: FavoriteCourseItem[] }>('/dashboard/saved');
  return data.courses;
};

export const fetchCompetitions = async (): Promise<CompetitionItem[]> => {
  if (isMockApi) return coldDelay(mockCompetitions);
  const data = await apiGet<{ competitions: CompetitionItem[] }>('/dashboard/competitions');
  return data.competitions;
};

export const fetchCertificates = async (): Promise<CertificateItem[]> => {
  if (isMockApi) return coldDelay(mockCertificates);
  const data = await apiGet<{ certificates: CertificateItem[] }>('/dashboard/competitions');
  return data.certificates;
};

export const fetchDashboardNotifications = async (): Promise<NotificationItemData[]> => {
  if (isMockApi) return coldDelay(mockDashboardNotifications);
  const data = await apiGet<{ items: NotificationItemData[] }>('/dashboard/notifications');
  return data.items;
};

export const fetchDrawerNotifications = async (): Promise<DashboardNotification[]> => {
  if (isMockApi) return coldDelay(mockNotifications);
  const data = await apiGet<{ drawer: DashboardNotification[] }>('/dashboard/notifications');
  return data.drawer;
};
