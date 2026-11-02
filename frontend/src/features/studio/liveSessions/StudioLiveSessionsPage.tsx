import React from 'react';
import { useAuth } from '@/features/auth/context/authContext';
import { StudioShell } from '@/features/studio/components/layout/StudioShell';
import { StudioProvider } from '@/features/studio/context/StudioProvider';
import { LiveSessionsManager } from './LiveSessionsManager';
import './liveSessions.css';

interface StudioLiveSessionsPageProps { courseSlug?: string; }

/** The authenticated instructor's global calendar or course-scoped session manager. */
export const StudioLiveSessionsPage: React.FC<StudioLiveSessionsPageProps> = ({ courseSlug }) => {
  const { user } = useAuth();
  return <StudioProvider key={user?.id ?? 'anonymous'}>
    <StudioShell>
      <LiveSessionsManager courseSlug={courseSlug} />
    </StudioShell>
  </StudioProvider>;
};
