import {
  BookOpen,
  Home,
  LayoutGrid,
  User,
  Award,
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
 * Shared dashboard navigation config used by the desktop sidebar so all
 * destinations are self-contained within the dashboard workspace.
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  {
    id: 'main',
    label: 'نظرة عامة',
    icon: Home,
    isExternalRoute: false,
  },
  {
    id: 'enrolled',
    label: 'الدورات المسجّلة',
    icon: BookOpen,
    isExternalRoute: false,
  },
  {
    id: 'profile',
    label: 'الملف الشخصي',
    icon: User,
    isExternalRoute: false,
  },
  {
    id: 'saved',
    label: 'المنح المحفوظة',
    icon: LayoutGrid,
    isExternalRoute: false,
  },
  {
    id: 'achievements',
    label: 'الشهادات والتحديات',
    icon: Award,
    isExternalRoute: false,
  },
];