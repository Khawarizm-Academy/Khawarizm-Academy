import React, { useEffect, useState } from 'react';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { EMPTY_PROFILE } from '@/features/profile/types';
import type { UserProfileData } from '@/features/profile/types';
import { ProfileContext } from '@/features/profile/context/profileContext';
import type { ProfileContextValue } from '@/features/profile/context/profileContext';
import { fetchProfile, saveProfile } from '@/features/profile/data/profileFetchers';

/** Owns the editable profile state so every section reads one source. */
export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfileData>(EMPTY_PROFILE);
  // Last saved snapshot, so "reset changes" restores the server value.
  const [savedProfile, setSavedProfile] = useState<UserProfileData>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  /** Load the saved profile once on mount. */
  useEffect(() => {
    let active = true;
    fetchProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setSavedProfile(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoading(false);
      });
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
    saveProfile(profile)
      .then((saved) => {
        setProfile(saved);
        setSavedProfile(saved);
      })
      .catch(() => undefined)
      .finally(() => {
        setIsSaving(false);
        flashToast();
      });
  };

  const resetProfile = () => setProfile(savedProfile);

  const value: ProfileContextValue = {
    profile,
    isLoading,
    isSaving,
    showToast,
    changeField,
    toggleInterest,
    toggleNotification,
    changeAvatar,
    saveChanges,
    resetProfile,
  };

  // The profile loads once; show a section skeleton until the server row arrives.
  if (isLoading) {
    return <DataSectionSkeleton variant="grid" count={2} />;
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};
