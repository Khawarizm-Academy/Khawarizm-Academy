import {
  BookOpen,
  GraduationCap,
  Home,
  LayoutGrid,
  User,
  type LucideIcon,
} from 'lucide-react';

/** Canonical catalog routes (single source of truth for ?type= query strings). */
export const CATALOG_COURSES_ROUTE = '/catalog?type=courses';
export const CATALOG_SCHOLARSHIPS_ROUTE = '/catalog?type=scholarships';

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  isExternalRoute: boolean;
}

/**
 * Shared dashboard navigation config used by the desktop sidebar so pillar /
 * dashboard destinations stay in sync with the shell bottom bar.
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  {
    id: 'main',
    label: 'الرئيسية',
    icon: Home,
    isExternalRoute: false,
  },
  {
    id: 'courses',
    label: 'الدورات',
    icon: BookOpen,
    path: CATALOG_COURSES_ROUTE,
    isExternalRoute: true,
  },
  {
    id: 'scholarships',
    label: 'المنح',
    icon: GraduationCap,
    path: CATALOG_SCHOLARSHIPS_ROUTE,
    isExternalRoute: true,
  },
  {
    id: 'saved',
    label: 'لوحتي المحفوظة',
    icon: LayoutGrid,
    isExternalRoute: false,
  },
  {
    id: 'profile',
    label: 'حسابي',
    icon: User,
    isExternalRoute: false,
  },
];