import React from 'react';
import { Navigate } from '../../../app/Navigate';

/**
 * ProfilePage canonical route handler.
 * Seamlessly normalizes /profile to the unified dashboard Profile view (/dashboard?view=profile)
 * ensuring full self-contained dashboard workspace persistence.
 */
export const ProfilePage: React.FC = () => {
  return <Navigate to="/dashboard?view=profile" replace />;
};