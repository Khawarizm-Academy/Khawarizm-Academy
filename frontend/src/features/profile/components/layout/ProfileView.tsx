import React from 'react';
import { ProfileProvider } from '@/features/profile/context/ProfileProvider';
import { ProfileContent } from '@/features/profile/components/layout/ProfileContent';

/** Thin composer: state lives in ProfileProvider, UI in ProfileContent. */
export const ProfileView: React.FC = () => (
  <ProfileProvider>
    <ProfileContent />
  </ProfileProvider>
);