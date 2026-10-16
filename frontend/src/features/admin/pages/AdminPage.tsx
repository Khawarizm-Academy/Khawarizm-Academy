import React from 'react';
import { useAuth } from '@/features/auth/context/authContext';
import { AdminProvider } from '@/features/admin/context/AdminProvider';
import { AdminShell } from '@/features/admin/components/layout/AdminShell';

/** Staff console page: the provider owns the data, the shell owns the layout. */
export const AdminPage: React.FC = () => {
  const { user, isReady } = useAuth();

  // RouteGuard redirects on its own; stay inert until auth has resolved.
  if (!isReady || !user?.isAdmin) return null;

  return (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  );
};
