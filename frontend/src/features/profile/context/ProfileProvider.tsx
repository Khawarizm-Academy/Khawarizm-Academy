import React, { useState } from 'react';
import { INITIAL_USER_PROFILE } from '@/features/profile/types';
import type { UserProfileData } from '@/features/profile/types';
import { ProfileContext } from '@/features/profile/context/profileContext';
import type { ProfileContextValue } from '@/features/profile/context/profileContext';

/** Owns the editable profile state so every section reads one source. */
export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfileData>(INITIAL_USER_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const changeField = <K extends keyof UserProfileData>(key: K, value: UserProfileData[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const toggleInterest = (interest: string) => {
    setProfile((prev) => {
      const exists = prev.interests.includes(interest);
      const updated = exists
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests: updated };
    });
  };

  const toggleNotification = (key: keyof UserProfileData['notifications']) => {
    setProfile((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const changeAvatar = (file: File) => {
    setProfile((prev) => ({ ...prev, avatarUrl: URL.createObjectURL(file) }));
  };

  const saveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    }, 700);
  };

  const resetProfile = () => {
    setProfile(INITIAL_USER_PROFILE);
  };

  const value: ProfileContextValue = {
    profile,
    isSaving,
    showToast,
    changeField,
    toggleInterest,
    toggleNotification,
    changeAvatar,
    saveChanges,
    resetProfile,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};