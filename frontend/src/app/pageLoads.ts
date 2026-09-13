import { lazy } from 'react';

/**
 * Lazy page loaders — one chunk per feature page.
 * Cold visits render the Tier 1 PageSkeleton (Suspense fallback in RootLayout)
 * while the page's chunk downloads.
 */

export const HomePage = lazy(() => import('../features/home/pages/HomePage').then((m) => ({ default: m.HomePage })));
export const CatalogPage = lazy(() => import('../features/catalog/pages/CatalogPage').then((m) => ({ default: m.CatalogPage })));
export const EventsPage = lazy(() => import('../features/events/pages/EventsPage').then((m) => ({ default: m.EventsPage })));
export const CompetitionsPage = lazy(() => import('../features/competitions/pages/CompetitionsPage').then((m) => ({ default: m.CompetitionsPage })));
export const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
export const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
export const CourseDetailPage = lazy(() => import('../features/courses/pages/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage })));
export const ScholarshipDetailPage = lazy(() => import('../features/scholarships/pages/ScholarshipDetailPage').then((m) => ({ default: m.ScholarshipDetailPage })));
export const LoginPage = lazy(() => import('../features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })));