import type { ComponentType } from 'react';
import {
  CATALOG_COURSES_ROUTE,
  CATALOG_SCHOLARSHIPS_ROUTE,
} from '../shared/lib/navigation';
import type { NavTabKey } from '../shared/lib/localization';
import {
  HomePage,
  CatalogPage,
  EventsPage,
  CompetitionsPage,
  DashboardPage,
  ProfilePage,
  CourseDetailPage,
  ScholarshipDetailPage,
  LoginPage,
} from './pageLoads';
import { NotFoundPage } from './pages/NotFoundPage';

export interface RouteMeta {
  title: string;
  description?: string;
  activeTab?: NavTabKey;
  /** Query values that switch the tab, e.g. ?type=courses lights the courses tab. */
  tabsByQuery?: Record<string, NavTabKey>;
  hideShell?: boolean; // no navbar, no footer, no bottom bar
  immersive?: boolean; // page owns its own nav, so no navbar and no footer
}

export type SkeletonVariant = 'home' | 'catalog' | 'detail' | 'dashboard' | 'default';

/** A route either renders a page or redirects, never both. */
export type RouteDefinition =
  | {
      path: string;
      redirect: string;
      meta?: RouteMeta;
      skeletonVariant?: SkeletonVariant;
    }
  | {
      path: string;
      component: ComponentType;
      meta?: RouteMeta;
      skeletonVariant?: SkeletonVariant;
    };

/** Every app route. First match wins, so `*` stays last. */
export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: HomePage,
    meta: {
      title: 'أكاديمية خوارزم — المرصد الأكاديمي والفرص الدولية',
      description: 'بوابة خوارزم للدورات التدريبية المتقدمة والمنح الدراسية العالمية الممولة بالكامل.',
      activeTab: 'home',
    },
    skeletonVariant: 'home',
  },
  {
    path: '/catalog',
    component: CatalogPage,
    meta: {
      title: 'دليل الدورات والمنح — أكاديمية خوارزم',
      description: 'استكشف مئات الدورات التدريبية المعتمدة وأرقى المنح الدراسية الدولية.',
      activeTab: 'catalog',
      tabsByQuery: { courses: 'courses', scholarships: 'scholarships' },
    },
    skeletonVariant: 'catalog',
  },
  {
    path: '/courses',
    redirect: CATALOG_COURSES_ROUTE,
    meta: { title: 'الدورات التدريبية — أكاديمية خوارزم', activeTab: 'courses' },
    skeletonVariant: 'catalog',
  },
  {
    path: '/scholarships',
    redirect: CATALOG_SCHOLARSHIPS_ROUTE,
    meta: { title: 'المنح والفرص الأكاديمية — أكاديمية خوارزم', activeTab: 'scholarships' },
    skeletonVariant: 'catalog',
  },
  {
    path: '/courses/:slug',
    component: CourseDetailPage,
    meta: { title: 'تفاصيل الدورة — أكاديمية خوارزم', activeTab: 'courses' },
    skeletonVariant: 'detail',
  },
  {
    path: '/scholarships/:slug',
    component: ScholarshipDetailPage,
    meta: { title: 'تفاصيل المنحة — أكاديمية خوارزم', activeTab: 'scholarships' },
    skeletonVariant: 'detail',
  },
  {
    path: '/events',
    component: EventsPage,
    meta: { title: 'الفعاليات والندوات — أكاديمية خوارزم', activeTab: 'events' },
    skeletonVariant: 'default',
  },
  {
    path: '/competitions',
    component: CompetitionsPage,
    meta: { title: 'المسابقات والتحديات — أكاديمية خوارزم', activeTab: 'competitions' },
    skeletonVariant: 'default',
  },
  {
    path: '/dashboard',
    component: DashboardPage,
    meta: {
      title: 'لوحة التحكم — أكاديمية خوارزم',
      activeTab: 'dashboard',
      tabsByQuery: { profile: 'profile' },
      immersive: true,
    },
    skeletonVariant: 'dashboard',
  },
  {
    path: '/dashboard/enrolled',
    redirect: '/dashboard?view=enrolled',
    meta: { title: 'الدورات المسجّلة — أكاديمية خوارزم', activeTab: 'dashboard' },
    skeletonVariant: 'dashboard',
  },
  {
    path: '/profile',
    component: ProfilePage,
    meta: { title: 'الملف الشخصي — أكاديمية خوارزم', activeTab: 'profile' },
    skeletonVariant: 'default',
  },
  {
    path: '/login',
    component: LoginPage,
    meta: {
      title: 'تسجيل الدخول — أكاديمية خوارزم',
      description: 'سجّل دخولك إلى منصة أكاديمية خوارزم واستكشف مساراتك الأكاديمية والمنح الممولة.',
      hideShell: true,
    },
    skeletonVariant: 'default',
  },
  {
    path: '/auth',
    redirect: '/login',
    meta: { title: 'تسجيل الدخول — أكاديمية خوارزم', hideShell: true },
    skeletonVariant: 'default',
  },
  {
    path: '*',
    component: NotFoundPage,
    meta: { title: 'الصفحة غير موجودة — أكاديمية خوارزم' },
    skeletonVariant: 'default',
  },
];

/** Params of a matched pattern like /courses/:slug, or null when it misses. */
export function matchRoute(
  pattern: string,
  pathname: string
): Record<string, string> | null {
  if (pattern === '*') return { wildcard: pathname };

  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(pathParts[i]);
    else if (part !== pathParts[i]) return null;
  }
  return params;
}

/** First route matching the path, with its params. */
export function findRoute(pathname: string) {
  for (const route of routes) {
    const params = matchRoute(route.path, pathname);
    if (params) return { route, params };
  }
  return null;
}

/** Active navbar tab for a URL: a tab declared by a query value wins, then route meta. */
export function resolveActiveTab(pathname: string, search: string): NavTabKey {
  const meta = findRoute(pathname)?.route.meta;
  if (!meta) return 'home';

  const query = new URLSearchParams(search);
  const fromQuery = [...query.values()].map((value) => meta.tabsByQuery?.[value]).find(Boolean);
  return fromQuery ?? meta.activeTab ?? 'home';
}