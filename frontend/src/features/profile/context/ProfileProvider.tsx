import React, { useEffect, useState } from 'react';
import { INITIAL_USER_PROFILE } from '@/features/profile/types';
import type { UserProfileData } from '@/features/profile/types';
import { ProfileContext } from '@/features/profile/context/profileContext';
import type { ProfileContextValue } from '@/features/profile/context/profileContext';
import { fetchProfile, saveProfile } from '@/features/profile/data/profileFetchers';
import { isMockApi } from '@/shared/lib/apiClient';

/** Owns the editable profile state so every section reads one source. */
export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfileData>(INITIAL_USER_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  /** Live mode loads the saved profile; mock mode keeps the seed. */
  useEffect(() => {
    if (isMockApi) return;
    let active = true;
    fetchProfile()
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

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

  /** Flash the transient save toast for 3.5s. */
  const flashToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  const saveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Mock mode fakes the save latency; live mode waits for the PATCH.
    if (isMockApi) {
      setTimeout(() => {
        setIsSaving(false);
        flashToast();
      }, 700);
      return;
    }

    saveProfile(profile)
      .then((saved) => setProfile(saved))
      .finally(() => {
        setIsSaving(false);
        flashToast();
      });
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