import { describe, expect, it } from 'vitest';
import routesJson from '@/shared/json/routes.json';
import { findRoute, resolveActiveTab, routes } from '@/app/routes';

describe('routes', () => {
  it('hydrates every entry from routes.json', () => {
    expect(routes).toHaveLength(routesJson.length);
  });

  it('gives every entry a page or a redirect, never both or neither', () => {
    for (const route of routes) {
      expect('component' in route).not.toBe('redirect' in route);
    }
  });

  it('locks the admin console behind the admin flag and off the site shell', () => {
    const admin = findRoute('/admin')?.route;

    expect(admin?.meta.requiresAdmin).toBe(true);
    expect(admin?.meta.hideShell).toBe(true);
    expect(admin?.meta.activeTab).toBeUndefined();
  });

  it('marks the private pages as signed-in only, and the landing page as public', () => {
    expect(findRoute('/dashboard')?.route.meta.requiresAuth).toBe(true);
    expect(findRoute('/profile')?.route.meta.requiresAuth).toBe(true);
    expect(findRoute('/')?.route.meta.requiresAuth).toBeUndefined();
    expect(findRoute('/catalog')?.route.meta.requiresAuth).toBeUndefined();
  });

  it('keeps the deep detail routes on their own tab', () => {
    const detail = findRoute('/courses/python-basics');

    expect(detail?.route.meta.activeTab).toBe('courses');
    expect(detail?.params).toEqual({ slug: 'python-basics' });
  });

  it('resolves the navbar tab from a query value before the route meta', () => {
    expect(resolveActiveTab('/catalog', '?type=courses')).toBe('courses');
    expect(resolveActiveTab('/catalog', '?type=scholarships')).toBe('scholarships');
    expect(resolveActiveTab('/catalog', '')).toBe('catalog');
  });

  it('falls back to the home tab for a path no route claims', () => {
    expect(resolveActiveTab('/no/such/page', '')).toBe('home');
  });
});
