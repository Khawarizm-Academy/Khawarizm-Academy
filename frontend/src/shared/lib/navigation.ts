import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Trophy,
  User,
  Award,
  type LucideIcon,
} from 'lucide-react';
import dashboardNavJson from '../json/dashboardNav.json';
import type { NavTabKey } from './localization';

/** Canonical catalog routes (single source of truth for ?type= query strings). */
export const CATALOG_COURSES_ROUTE = '/catalog?type=courses';
export const CATALOG_SCHOLARSHIPS_ROUTE = '/catalog?type=scholarships';

/** Where every shell tab and the login button navigate to. */
export const NAV_TARGETS = {
  home: '/',
  catalog: '/catalog',
  courses: CATALOG_COURSES_ROUTE,
  scholarships: CATALOG_SCHOLARSHIPS_ROUTE,
  events: '/events',
  competitions: '/competitions',
  dashboard: '/dashboard',
  profile: '/dashboard?view=profile',
  login: '/login',
} as const satisfies Record<string, string>;

export interface ShellNavTab {
  key: NavTabKey;
  icon: LucideIcon;
  desktop: boolean;
  mobile: boolean;
}

/** One nav list; the desktop navbar and the mobile bottom bar render their own subset. */
export const NAV_TABS: ShellNavTab[] = [
  { key: 'home', icon: Home, desktop: true, mobile: true },
  { key: 'courses', icon: BookOpen, desktop: true, mobile: true },
  { key: 'scholarships', icon: GraduationCap, desktop: true, mobile: true },
  { key: 'events', icon: CalendarDays, desktop: true, mobile: false },
  { key: 'competitions', icon: Trophy, desktop: true, mobile: false },
  { key: 'dashboard', icon: LayoutDashboard, desktop: false, mobile: true },
  { key: 'profile', icon: User, desktop: false, mobile: true },
];

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  isExternalRoute: boolean;
}

/** Icons dashboardNav.json is allowed to reference. */
const DASHBOARD_NAV_ICONS = {
  Home,
  BookOpen,
  User,
  LayoutGrid,
  Award,
} satisfies Record<string, LucideIcon>;

/** Icon names allowed inside `dashboardNav.json`. */
export type DashboardNavIconName = keyof typeof DASHBOARD_NAV_ICONS;

/** Widened lookup so unknown names coming from the JSON are a runtime error, not a crash on `undefined`. */
const ICON_BY_NAME: Readonly<Record<string, LucideIcon | undefined>> = DASHBOARD_NAV_ICONS;

/** Raw (unhydrated) shape of a `dashboardNav.json` entry. */
interface DashboardNavJsonItem {
  id: string;
  label: string;
  icon: DashboardNavIconName;
  isExternalRoute: boolean;
  path?: string;
}

/** Hydrates the icon names in dashboardNav.json into real components. */
export const DASHBOARD_NAV: DashboardNavItem[] = (
  dashboardNavJson as DashboardNavJsonItem[]
).map((item) => {
  const icon = ICON_BY_NAME[item.icon];

  if (!icon) {
    throw new Error(
      `[navigation] Unknown icon "${item.icon}" for dashboard nav item "${item.id}". ` +
        `Register it in DASHBOARD_NAV_ICONS (src/shared/lib/navigation.ts).`
    );
  }

  if (item.isExternalRoute && !item.path) {
    throw new Error(
      `[navigation] Dashboard nav item "${item.id}" is marked isExternalRoute but has no "path".`
    );
  }

  return { ...item, icon };
});
