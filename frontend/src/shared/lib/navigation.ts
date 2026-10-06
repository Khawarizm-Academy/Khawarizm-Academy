import {
  BookOpen,
  Home,
  LayoutGrid,
  User,
  Award,
  type LucideIcon,
} from 'lucide-react';
import dashboardNavJson from '../json/dashboardNav.json';

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

/**
 * Shared dashboard navigation config used by the desktop sidebar.
 *
 * Source of truth is `src/shared/json/dashboardNav.json` (design-owned data);
 * this module only hydrates icon names into components so consumers get a
 * fully-typed `DashboardNavItem[]`.
 *
 * All current destinations are self-contained within the dashboard workspace:
 * `isExternalRoute: false` items are in-dashboard views and route through
 * `onSelectView(id)` to `/dashboard?view=<id>`; external items must ship a
 * `path` and navigate there directly.
 */
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
