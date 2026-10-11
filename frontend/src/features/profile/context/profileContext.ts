import { createContext, useContext } from 'react';
import type { FormEvent } from 'react';
import type { UserProfileData } from '../types';

export interface ProfileContextValue {
  profile: UserProfileData;
  isSaving: boolean;
  showToast: boolean;
  changeField: <K extends keyof UserProfileData>(key: K, value: UserProfileData[K]) => void;
  toggleInterest: (interest: string) => void;
  toggleNotification: (key: keyof UserProfileData['notifications']) => void;
  changeAvatar: (file: File) => void;
  saveChanges: (e: FormEvent) => void;
  resetProfile: () => void;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

/** Every piece of editable profile state the sections share. */
export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('[profile] useProfile must be used inside ProfileProvider.');
  return value;
}