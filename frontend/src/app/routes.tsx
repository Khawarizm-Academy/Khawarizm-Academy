import type { ComponentType } from 'react';
import {
  CompetitionsPage,
  CourseDetailPage,
  CatalogPage,
  DashboardPage,
  EventsPage,
  HomePage,
  LoginPage,
  ProfilePage,
  ScholarshipDetailPage,
} from './pageLoads';
import { NotFoundPage } from './pages/NotFoundPage';
import routesJson from '../shared/json/routes.json';
import type { NavTabKey } from '../shared/lib/localization';

export type SkeletonVariant = 'home' | 'catalog' | 'detail' | 'dashboard' | 'default';

export interface RouteMeta {
  title: string;
  description?: string;
  activeTab?: NavTabKey;
  /** Query values that switch the tab, e.g. ?type=courses lights the courses tab. */
  tabsByQuery?: Record<string, NavTabKey>;
  hideShell?: boolean; // no navbar, no footer, no bottom bar
  immersive?: boolean; // page owns its own nav, so no navbar and no footer
}

/** Raw (unhydrated) shape of a `routes.json` entry. */
interface RawRoute {
  path: string;
  redirect?: string;
  title: string;
  description?: string;
  activeTab?: NavTabKey;
  tabsByQuery?: Record<string, NavTabKey>;
  hideShell?: boolean;
  immersive?: boolean;
  skeletonVariant: SkeletonVariant;
}

/** A route either renders a page or redirects, never both. */
export type RouteDefinition =
  | {
      path: string;
      redirect: string;
      meta: RouteMeta;
      skeletonVariant: SkeletonVariant;
    }
  | {
      path: string;
      component: ComponentType;
      meta: RouteMeta;
      skeletonVariant: SkeletonVariant;
    };

/** The page each path renders. Paths without one are redirects. */
const PAGE_BY_PATH: Record<string, ComponentType> = {
  '/': HomePage,
  '/catalog': CatalogPage,
  '/courses/:slug': CourseDetailPage,
  '/scholarships/:slug': ScholarshipDetailPage,
  '/events': EventsPage,
  '/competitions': CompetitionsPage,
  '/dashboard': DashboardPage,
  '/profile': ProfilePage,
  '/login': LoginPage,
  '*': NotFoundPage,
};

/** Every route, from routes.json plus its page. Order comes from the JSON. */
export const routes: RouteDefinition[] = (routesJson as RawRoute[]).map((route) => {
  const { title, description, activeTab, tabsByQuery, hideShell, immersive } = route;
  const meta: RouteMeta = { title, description, activeTab, tabsByQuery, hideShell, immersive };
  const page = PAGE_BY_PATH[route.path];

  if (route.redirect) {
    return { path: route.path, redirect: route.redirect, meta, skeletonVariant: route.skeletonVariant };
  }

  if (!page) {
    throw new Error(`[routes] "${route.path}" has no page and no redirect.`);
  }

  return { path: route.path, component: page, meta, skeletonVariant: route.skeletonVariant };
});

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