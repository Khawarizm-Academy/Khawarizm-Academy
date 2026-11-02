import { lazy } from 'react';

/** Lazy pages, one chunk each; the Suspense skeleton in RootLayout covers the load. */

export const HomePage = lazy(() => import('../features/home/pages/HomePage').then((m) => ({ default: m.HomePage })));
export const CatalogPage = lazy(() => import('../features/catalog/pages/CatalogPage').then((m) => ({ default: m.CatalogPage })));
export const EventsPage = lazy(() => import('../features/events/pages/EventsPage').then((m) => ({ default: m.EventsPage })));
export const CompetitionsPage = lazy(() => import('../features/competitions/pages/CompetitionsPage').then((m) => ({ default: m.CompetitionsPage })));
export const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
export const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
export const AdminPage = lazy(() => import('../features/admin/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
export const CourseLandingPage = lazy(() => import('../features/courses/pages/CourseLandingPage').then((m) => ({ default: m.CourseLandingPage })));
export const CoursePlayerPage = lazy(() => import('../features/courses/pages/CoursePlayerPage').then((m) => ({ default: m.CoursePlayerPage })));
export const CourseCertificatePage = lazy(() => import('../features/courses/pages/CourseCertificatePage').then((m) => ({ default: m.CourseCertificatePage })));
export const ScholarshipDetailPage = lazy(() => import('../features/scholarships/pages/ScholarshipDetailPage').then((m) => ({ default: m.ScholarshipDetailPage })));
export const LoginPage = lazy(() => import('../features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
export const StudioHomePage = lazy(() => import('../features/studio/pages/StudioHomePage').then((m) => ({ default: m.StudioHomePage })));
export const StudioCoursesPage = lazy(() => import('../features/studio/pages/StudioCoursesPage').then((m) => ({ default: m.StudioCoursesPage })));
export const StudioNewCoursePage = lazy(() => import('../features/studio/pages/StudioNewCoursePage').then((m) => ({ default: m.StudioNewCoursePage })));
export const StudioProfilePage = lazy(() => import('../features/studio/pages/StudioProfilePage').then((m) => ({ default: m.StudioProfilePage })));
export const StudioCourseEditorPage = lazy(() => import('../features/studio/pages/StudioCourseEditorPage').then((m) => ({ default: m.StudioCourseEditorPage })));
export const StudioVideosPage = lazy(() => import('../features/studio/pages/StudioPlaceholderPages').then((m) => ({ default: m.StudioVideosPage })));
export const StudioQuizzesPage = lazy(() => import('../features/studio/pages/StudioPlaceholderPages').then((m) => ({ default: m.StudioQuizzesPage })));
export const StudioQuizEditorPage = lazy(() => import('../features/studio/pages/StudioPlaceholderPages').then((m) => ({ default: m.StudioQuizEditorPage })));
export const StudioStudentsPage = lazy(() => import('../features/studio/pages/StudioPlaceholderPages').then((m) => ({ default: m.StudioStudentsPage })));
export const StudioAnalyticsPage = lazy(() => import('../features/studio/pages/StudioPlaceholderPages').then((m) => ({ default: m.StudioAnalyticsPage })));
