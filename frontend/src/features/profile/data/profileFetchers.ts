import { apiGet, apiPatch, isMockApi } from '@/shared/lib/apiClient';
import { INITIAL_USER_PROFILE } from '@/features/profile/types';
import type { UserProfileData } from '@/features/profile/types';

/** Seed profile used in mock mode and as the live fetch's fallback. */
export const PROFILE_MOCK_DATA = INITIAL_USER_PROFILE;

/** Load the learner's profile; live mode reads GET /profile. */
export async function fetchProfile(): Promise<UserProfileData> {
  if (!isMockApi) return apiGet<UserProfileData>('/profile');
  return PROFILE_MOCK_DATA;
}

/** Persist profile edits; live mode PATCHes /profile and echoes the saved row. */
export async function saveProfile(profile: UserProfileData): Promise<UserProfileData> {
  if (!isMockApi) return apiPatch<UserProfileData>('/profile', profile);
  return profile;
}
