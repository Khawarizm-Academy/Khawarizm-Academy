import type {
  CertificateItem,
  CompetitionItem,
  DashboardNotification,
  DashboardStats,
  EnrolledCourse,
  FavoriteCourseItem,
  LiveSessionInfo,
  NotificationItemData,
  SavedScholarshipItem,
  UpcomingEvent,
} from '@/features/dashboard/types';
import mockJson from '@/shared/json/mockDashboard.json';

/** Mock records live in JSON; this file only adds the types JSON cannot carry. */
export const mockEnrolledCourses = mockJson.enrolledCourses as EnrolledCourse[];
export const mockPriorityContinueCourse = mockJson.priorityContinueCourse;
export const mockImminentLiveSession = mockJson.imminentLiveSession as LiveSessionInfo;
export const mockDashboardStats = mockJson.stats as DashboardStats;
export const mockUpcomingEvents = mockJson.upcomingEvents as UpcomingEvent[];
export const mockNotifications = mockJson.notifications as DashboardNotification[];
export const mockDashboardNotifications = mockJson.dashboardNotifications as NotificationItemData[];
export const mockSavedScholarships = mockJson.savedScholarships as SavedScholarshipItem[];
export const mockFavoriteCourses = mockJson.favoriteCourses as FavoriteCourseItem[];
export const mockCompetitions = mockJson.competitions as CompetitionItem[];
export const mockCertificates = mockJson.certificates as CertificateItem[];
