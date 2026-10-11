import React from 'react';
import { Navigate } from '@/app/Navigate';
import { NAV_TARGETS } from '@/shared/lib/navigation';

/** Sends /profile to the dashboard profile view. */
export const ProfilePage: React.FC = () => {
  return <Navigate to={NAV_TARGETS.profile} replace />;
};