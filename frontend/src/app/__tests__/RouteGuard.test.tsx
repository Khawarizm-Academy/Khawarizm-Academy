import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouteGuard } from '@/app/RouteGuard';
import { RouterContext } from '@/app/routerContext';
import type { RouteDefinition, RouteMeta } from '@/app/routes';
import { AuthContext } from '@/features/auth/context/authContext';
import type { AuthContextValue } from '@/features/auth/context/authContext';
import { EMPTY_AUTH_USER } from '@/features/auth/types';
import type { AuthUser } from '@/features/auth/types';

const LEARNER: AuthUser = { ...EMPTY_AUTH_USER, id: 'user-1', email: 'ahmad@example.com' };
const ADMIN: AuthUser = { ...EMPTY_AUTH_USER, id: 'user-2', email: 'admin@example.com', role: 'admin', isAdmin: true };

const routeWithMeta = (meta: Partial<RouteMeta>, path = '/dashboard'): RouteDefinition => ({
  path,
  component: () => null,
  meta: { title: 'صفحة', ...meta },
  skeletonVariant: 'default',
});

const authValue = (overrides: Partial<AuthContextValue> = {}): AuthContextValue => ({
  user: null,
  config: null,
  isReady: true,
  isSubmitting: false,
  notice: null,
  signIn: async () => undefined,
  signOut: async () => undefined,
  setNotice: () => undefined,
  ...overrides,
});

function renderGuard(route: RouteDefinition, auth: AuthContextValue) {
  const navigate = vi.fn();
  render(
    <RouterContext.Provider
      value={{ pathname: route.path, search: '', params: {}, activeRoute: route, navigate }}
    >
      <AuthContext.Provider value={auth}>
        <RouteGuard>
          <div data-testid="page" />
        </RouteGuard>
      </AuthContext.Provider>
    </RouterContext.Provider>
  );
  return { navigate };
}

describe('RouteGuard', () => {
  it('lets a public page through untouched', () => {
    const { navigate } = renderGuard(routeWithMeta({}), authValue());

    expect(screen.getByTestId('page')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('waits for the session to boot instead of flashing the login page', () => {
    const { navigate } = renderGuard(routeWithMeta({ requiresAuth: true }), authValue({ isReady: false }));

    expect(screen.queryByTestId('page')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends a guest to the login page carrying where they were headed', () => {
    const { navigate } = renderGuard(routeWithMeta({ requiresAuth: true }), authValue());

    expect(screen.queryByTestId('page')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login?next=%2Fdashboard', { replace: true });
  });

  it('keeps the query string in the next hop', () => {
    const route = routeWithMeta({ requiresAuth: true }, '/profile');
    const navigate = vi.fn();
    render(
      <RouterContext.Provider
        value={{ pathname: '/profile', search: '?tab=security', params: {}, activeRoute: route, navigate }}
      >
        <AuthContext.Provider value={authValue()}>
          <RouteGuard>
            <div data-testid="page" />
          </RouteGuard>
        </AuthContext.Provider>
      </RouterContext.Provider>
    );

    expect(navigate).toHaveBeenCalledWith('/login?next=%2Fprofile%3Ftab%3Dsecurity', { replace: true });
  });

  it('treats the admin flag as auth too, so a guest never reaches the console', () => {
    const { navigate } = renderGuard(routeWithMeta({ requiresAdmin: true }, '/admin'), authValue());

    expect(navigate).toHaveBeenCalledWith('/login?next=%2Fadmin', { replace: true });
  });

  it('bounces a signed-in learner away from the admin console', () => {
    const { navigate } = renderGuard(
      routeWithMeta({ requiresAdmin: true }, '/admin'),
      authValue({ user: LEARNER })
    );

    expect(screen.queryByTestId('page')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('lets an admin into the admin console', () => {
    const { navigate } = renderGuard(
      routeWithMeta({ requiresAdmin: true }, '/admin'),
      authValue({ user: ADMIN })
    );

    expect(screen.getByTestId('page')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('lets a signed-in learner into a private page', () => {
    const { navigate } = renderGuard(routeWithMeta({ requiresAuth: true }), authValue({ user: LEARNER }));

    expect(screen.getByTestId('page')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });
});
