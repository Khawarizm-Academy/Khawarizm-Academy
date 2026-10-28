import { apiGet, apiPost } from '@/shared/lib/apiClient';
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

/** The priority "continue learning" row carried by the dashboard summary. */
export interface PriorityContinue {
  id: string;
  title: string;
  levelDuration?: string;
  instructorSubtitle?: string;
  lessonStatus?: string;
  progress: number;
  thumbnail: string;
}

/** Shape of GET /dashboard (the summary endpoint). */
interface DashboardSummary {
  stats: DashboardStats | null;
  priorityContinue: PriorityContinue | null;
  imminentLiveSession: LiveSessionInfo | null;
  upcomingEvents: UpcomingEvent[];
}

const fetchSummary = () => apiGet<DashboardSummary>('/dashboard');

export const fetchEnrolledCourses = (): Promise<EnrolledCourse[]> =>
  apiGet<{ items: EnrolledCourse[] }>('/dashboard/enrolled').then((data) => data.items);

export const fetchPriorityContinue = async (): Promise<PriorityContinue[]> => {
  const summary = await fetchSummary();
  return summary.priorityContinue ? [summary.priorityContinue] : [];
};

export const fetchImminentLiveSession = async (): Promise<LiveSessionInfo | null> => {
  const summary = await fetchSummary();
  return summary.imminentLiveSession;
};

export const fetchDashboardStats = async (): Promise<DashboardStats | null> => {
  const summary = await fetchSummary();
  return summary.stats;
};

export const fetchUpcomingEvents = async (): Promise<UpcomingEvent[]> => {
  const summary = await fetchSummary();
  return summary.upcomingEvents;
};

export const fetchSavedScholarships = async (): Promise<SavedScholarshipItem[]> => {
  const data = await apiGet<{ scholarships: SavedScholarshipItem[] }>('/dashboard/saved');
  return data.scholarships;
};

export const fetchFavoriteCourses = async (): Promise<FavoriteCourseItem[]> => {
  const data = await apiGet<{ courses: FavoriteCourseItem[] }>('/dashboard/saved');
  return data.courses;
};

export const fetchCompetitions = async (): Promise<CompetitionItem[]> => {
  const data = await apiGet<{ competitions: CompetitionItem[] }>('/dashboard/competitions');
  return data.competitions;
};

export const fetchCertificates = async (): Promise<CertificateItem[]> => {
  const data = await apiGet<{ certificates: CertificateItem[] }>('/dashboard/competitions');
  return data.certificates;
};

export const fetchDashboardNotifications = async (): Promise<NotificationItemData[]> => {
  const data = await apiGet<{ items: NotificationItemData[] }>('/dashboard/notifications');
  return data.items;
};

export const fetchDrawerNotifications = async (): Promise<DashboardNotification[]> => {
  const data = await apiGet<{ drawer: DashboardNotification[] }>('/dashboard/notifications');
  return data.drawer;
};

export const markNotificationRead = (id: string): Promise<{ read: boolean }> =>
  apiPost<{ read: boolean }>(`/dashboard/notifications/${id}/read`);
