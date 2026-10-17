import React from 'react';
import { Navigate } from '@/app/Navigate';
import { useRouter } from '@/app/routerContext';
import { PageSkeleton } from '@/shared/components/Loading/PageSkeleton';
import { useAuth } from '@/features/auth/context/authContext';

/** Enforces the `requiresAuth` / `requiresAdmin` flags on the active route. */
export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeRoute, pathname, search } = useRouter();
  const { user, isReady } = useAuth();

  const meta = activeRoute?.meta;
  const needsAuth = Boolean(meta?.requiresAuth || meta?.requiresAdmin);

  // Wait for the boot rehydrate so a signed-in reader never flashes the login page.
  if (needsAuth && !isReady) return <PageSkeleton variant={activeRoute?.skeletonVariant ?? 'default'} />;

  if (needsAuth && !user) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (meta?.requiresAdmin && !user?.isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
