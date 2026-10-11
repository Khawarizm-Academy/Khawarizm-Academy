import { lazy } from 'react';

/** Lazy pages, one chunk each; the Suspense skeleton in RootLayout covers the load. */

export const HomePage = lazy(() => import('../features/home/pages/HomePage').then((m) => ({ default: m.HomePage })));
export const CatalogPage = lazy(() => import('../features/catalog/pages/CatalogPage').then((m) => ({ default: m.CatalogPage })));
export const EventsPage = lazy(() => import('../features/events/pages/EventsPage').then((m) => ({ default: m.EventsPage })));
export const CompetitionsPage = lazy(() => import('../features/competitions/pages/CompetitionsPage').then((m) => ({ default: m.CompetitionsPage })));
export const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
export const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
export const CourseLandingPage = lazy(() => import('../features/courses/pages/CourseLandingPage').then((m) => ({ default: m.CourseLandingPage })));
export const CoursePlayerPage = lazy(() => import('../features/courses/pages/CoursePlayerPage').then((m) => ({ default: m.CoursePlayerPage })));
export const CourseCertificatePage = lazy(() => import('../features/courses/pages/CourseCertificatePage').then((m) => ({ default: m.CourseCertificatePage })));
export const ScholarshipDetailPage = lazy(() => import('../features/scholarships/pages/ScholarshipDetailPage').then((m) => ({ default: m.ScholarshipDetailPage })));
export const LoginPage = lazy(() => import('../features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })));