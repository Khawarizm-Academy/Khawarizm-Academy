import {
  Award,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  Code2,
  GraduationCap,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Palette,
  Sparkles,
  Trophy,
  User,
  type LucideIcon,
} from 'lucide-react';
import dashboardNavJson from '@/shared/json/dashboardNav.json';
import shellNavJson from '@/shared/json/shellNav.json';
import type { NavTabKey } from '@/shared/lib/localization';

/** Every icon a JSON config may reference. */
const ICONS = {
  Award,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  Code2,
  GraduationCap,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Palette,
  Sparkles,
  Trophy,
  User,
} satisfies Record<string, LucideIcon>;

/** Icon names allowed inside any JSON config. */
export type IconName = keyof typeof ICONS;

/** Turns an icon name from JSON into a component. */
export function resolveIcon(name: string): LucideIcon {
  const icon = (ICONS as Record<string, LucideIcon | undefined>)[name];
  if (!icon) {
    throw new Error(`[navigation] Unknown icon "${name}". Add it to ICONS in navigation.ts.`);
  }
  return icon;
}

/** Where every shell tab and the login button navigate to. */
export const NAV_TARGETS = shellNavJson.targets as Record<NavTabKey | 'login', string>;

/** Canonical catalog routes (single source of truth for ?type= query strings). */
export const CATALOG_COURSES_ROUTE = NAV_TARGETS.courses;
export const CATALOG_SCHOLARSHIPS_ROUTE = NAV_TARGETS.scholarships;

export interface ShellNavTab {
  key: NavTabKey;
  icon: LucideIcon;
  desktop: boolean;
  mobile: boolean;
}

/** One nav list; the desktop navbar and the mobile bottom bar render their own subset. */
export const NAV_TABS: ShellNavTab[] = shellNavJson.tabs.map((tab) => ({
  key: tab.key as NavTabKey,
  icon: resolveIcon(tab.icon),
  desktop: tab.desktop,
  mobile: tab.mobile,
}));

/** The tabs the dashboard top bar shows. */
export const DASHBOARD_TOP_BAR_TABS = NAV_TABS.filter((tab) => tab.desktop);

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  isExternalRoute: boolean;
  /** Extra ?view= values that highlight this item. */
  aliases: string[];
  /** Shows in the pill strip above the dashboard content. */
  inSubNav: boolean;
  /** Every view value that highlights this item, its own id included. */
  activeViews: string[];
}

/** Raw (unhydrated) shape of a `dashboardNav.json` entry. */
interface DashboardNavJsonItem {
  id: string;
  label: string;
  icon: string;
  isExternalRoute: boolean;
  aliases: string[];
  inSubNav: boolean;
  path?: string;
}

/** Hydrates the icon names in dashboardNav.json into real components. */
export const DASHBOARD_NAV: DashboardNavItem[] = (
  dashboardNavJson as DashboardNavJsonItem[]
).map((item) => {
  if (item.isExternalRoute && !item.path) {
    throw new Error(
      `[navigation] Dashboard nav item "${item.id}" is marked isExternalRoute but has no "path".`
    );
  }

  return {
    ...item,
    icon: resolveIcon(item.icon),
    activeViews: [item.id, ...item.aliases],
  };
});

/** The pill strip shown above dashboard content. */
export const DASHBOARD_SUB_NAV = DASHBOARD_NAV.filter((item) => item.inSubNav);

/** The nav item a ?view= value belongs to, or null for views outside the sidebar. */
export function getDashboardNavItem(view: string): DashboardNavItem | null {
  return DASHBOARD_NAV.find((item) => item.activeViews.includes(view)) ?? null;
}