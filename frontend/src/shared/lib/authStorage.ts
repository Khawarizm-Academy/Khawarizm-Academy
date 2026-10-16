/**
 * Persists the access/refresh token pair the API hands the SPA.
 *
 * Kept in one tiny module so `apiClient` can read and refresh tokens without
 * importing React state, and the auth provider can clear them on sign-out.
 */

const ACCESS_KEY = 'khawarizm.accessToken';
const REFRESH_KEY = 'khawarizm.refreshToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
