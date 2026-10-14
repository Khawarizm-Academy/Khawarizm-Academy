import { apiGet, apiPatch } from '@/shared/lib/apiClient';
import type { UserProfileData } from '@/features/profile/types';

/** Load the learner's profile from GET /profile. */
export function fetchProfile(): Promise<UserProfileData> {
  return apiGet<UserProfileData>('/profile');
}

/** Persist profile edits via PATCH /profile and echo the saved row. */
export function saveProfile(profile: UserProfileData): Promise<UserProfileData> {
  return apiPatch<UserProfileData>('/profile', profile);
}
