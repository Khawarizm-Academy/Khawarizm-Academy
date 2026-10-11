import React from 'react';
import { ProfileProvider } from '../context/ProfileProvider';
import { ProfileContent } from './ProfileContent';

/** Thin composer: state lives in ProfileProvider, UI in ProfileContent. */
export const ProfileView: React.FC = () => (
  <ProfileProvider>
    <ProfileContent />
  </ProfileProvider>
);