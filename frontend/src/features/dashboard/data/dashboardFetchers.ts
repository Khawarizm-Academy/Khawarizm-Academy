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
} from '../types';
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
} from './mockDashboardData';

const COLD_LATENCY_MS = 400;

function coldDelay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), COLD_LATENCY_MS));
}

export const fetchEnrolledCourses = (): Promise<EnrolledCourse[]> =>
  coldDelay(mockEnrolledCourses);

export const fetchPriorityContinue = (): Promise<(typeof mockPriorityContinueCourse)[]> =>
  coldDelay([mockPriorityContinueCourse]);

export const fetchImminentLiveSession = (): Promise<LiveSessionInfo> =>
  coldDelay(mockImminentLiveSession);

export const fetchDashboardStats = (): Promise<DashboardStats> =>
  coldDelay(mockDashboardStats);

export const fetchUpcomingEvents = (): Promise<UpcomingEvent[]> =>
  coldDelay(mockUpcomingEvents);

export const fetchSavedScholarships = (): Promise<SavedScholarshipItem[]> =>
  coldDelay(mockSavedScholarships);

export const fetchFavoriteCourses = (): Promise<FavoriteCourseItem[]> =>
  coldDelay(mockFavoriteCourses);

export const fetchCompetitions = (): Promise<CompetitionItem[]> =>
  coldDelay(mockCompetitions);

export const fetchCertificates = (): Promise<CertificateItem[]> =>
  coldDelay(mockCertificates);

export const fetchDashboardNotifications = (): Promise<NotificationItemData[]> =>
  coldDelay(mockDashboardNotifications);

export const fetchDrawerNotifications = (): Promise<DashboardNotification[]> =>
  coldDelay(mockNotifications);