import React from 'react';
import { useAuth } from '@/features/auth/context/authContext';
import { can } from '@/shared/lib/permissions';
import { AdminProvider } from '@/features/admin/context/AdminProvider';
import { AdminShell } from '@/features/admin/components/layout/AdminShell';

/** Staff console page: the provider owns the data, the shell owns the layout. */
export const AdminPage: React.FC = () => {
  const { user, isReady } = useAuth();
  // Phase 12: the legacy `isAdmin` UI fallback is retired — the UI reads
  // permissions only. The `isAdmin` field still rides in the auth payload as
  // an additive compatibility output (backlog B9 will remove it later).
  const canAccessAdmin = can(user, 'admin.access');

  // RouteGuard redirects on its own; stay inert until auth has resolved.
  if (!isReady || !canAccessAdmin) return null;

  return (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  );
};
