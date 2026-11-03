import React from 'react';
import { Navigate } from '@/app/Navigate';
import { useRouter } from '@/app/routerContext';
import { PageSkeleton } from '@/shared/components/Loading/PageSkeleton';
import { useAuth } from '@/features/auth/context/authContext';
import { can, canAny } from '@/shared/lib/permissions';

/** Enforces auth, permission, and legacy admin requirements on the active route. */
export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeRoute, pathname, search } = useRouter();
  const { user, isReady } = useAuth();

  const meta = activeRoute?.meta;
  const needsAuth = Boolean(meta?.requiresAuth || meta?.requiresAdmin || meta?.requiresPermission);

  // Wait for the boot rehydrate so a signed-in reader never flashes the login page.
  if (needsAuth && !isReady) return <PageSkeleton variant={activeRoute?.skeletonVariant ?? 'default'} />;

  if (needsAuth && !user) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (meta?.requiresPermission && !canAny(user, meta.requiresPermission)) {
    return <Navigate to="/" replace />;
  }

  // Phase 12: `requiresAdmin` now means one permission key, not the legacy flag.
  if (meta?.requiresAdmin && !can(user, 'admin.access')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
