import type { NavTabKey } from '../shared/lib/localization';
import { Navigate } from './Navigate';
import { NotFoundPage } from './pages/NotFoundPage';
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

export interface RouteMeta {
  title: string;
  description?: string;
  activeTab?: NavTabKey;
  hideShell?: boolean;
}

export type SkeletonVariant = 'home' | 'catalog' | 'detail' | 'dashboard' | 'default';

export interface RouteDefinition {
  path: string;
  component: React.ComponentType;
  meta?: RouteMeta;
  skeletonVariant?: SkeletonVariant;
}

/**
 * Master Route Registry for Khawarizm Academy.
 *
 * Routing rules:
 * - One canonical catalog URL: `/catalog?type=…`. `/courses` and `/scholarships`
 *   redirect to it so the URL and the catalog's `?type` filter never disagree.
 * - Detail pages use dynamic segments (`/courses/:slug`) resolved via `useParams`.
 * - The `*` catch-all renders a themed 404 instead of a blank page.
 */
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
    },
    skeletonVariant: 'catalog',
  },
  {
    path: '/courses',
    component: () => <Navigate to="/catalog?type=courses" />,
    meta: {
      title: 'الدورات التدريبية — أكاديمية خوارزم',
      activeTab: 'courses',
    },
    skeletonVariant: 'catalog',
  },
  {
    path: '/scholarships',
    component: () => <Navigate to="/catalog?type=scholarships" />,
    meta: {
      title: 'المنح والفرص الأكاديمية — أكاديمية خوارزم',
      activeTab: 'scholarships',
    },
    skeletonVariant: 'catalog',
  },
  {
    path: '/courses/:slug',
    component: CourseDetailPage,
    meta: {
      title: 'تفاصيل الدورة — أكاديمية خوارزم',
      activeTab: 'courses',
    },
    skeletonVariant: 'detail',
  },
  {
    path: '/scholarships/:slug',
    component: ScholarshipDetailPage,
    meta: {
      title: 'تفاصيل المنحة — أكاديمية خوارزم',
      activeTab: 'scholarships',
    },
    skeletonVariant: 'detail',
  },
  {
    path: '/events',
    component: EventsPage,
    meta: {
      title: 'الفعاليات والندوات — أكاديمية خوارزم',
      activeTab: 'events',
    },
    skeletonVariant: 'default',
  },
  {
    path: '/competitions',
    component: CompetitionsPage,
    meta: {
      title: 'المسابقات والتحديات — أكاديمية خوارزم',
      activeTab: 'competitions',
    },
    skeletonVariant: 'default',
  },
  {
    path: '/dashboard',
    component: DashboardPage,
    meta: {
      title: 'لوحة التحكم — أكاديمية خوارزم',
      activeTab: 'dashboard',
    },
    skeletonVariant: 'dashboard',
  },
  {
    path: '/profile',
    component: ProfilePage,
    meta: {
      title: 'الملف الشخصي — أكاديمية خوارزم',
      activeTab: 'profile',
    },
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
    component: () => <Navigate to="/login" />,
    meta: {
      title: 'تسجيل الدخول — أكاديمية خوارزم',
      hideShell: true,
    },
    skeletonVariant: 'default',
  },
  {
    path: '*',
    component: NotFoundPage,
    meta: {
      title: 'الصفحة غير موجودة — أكاديمية خوارزم',
    },
    skeletonVariant: 'default',
  },
];