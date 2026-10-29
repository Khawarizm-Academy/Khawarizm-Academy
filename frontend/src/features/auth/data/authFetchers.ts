import { apiGet, apiPost } from '@/shared/lib/apiClient';
import type { AuthConfig, AuthResult, AuthSession, AuthUser } from '@/features/auth/types';

/** Firebase client config + accepted providers. */
export function fetchAuthConfig(): Promise<AuthConfig> {
  return apiGet<AuthConfig>('/auth/config');
}

/** Exchange a Firebase ID token (or a dev token) for our access/refresh pair. */
export function loginWithIdToken(idToken: string): Promise<AuthResult> {
  return apiPost<AuthResult>('/auth/firebase', { idToken });
}

/** The signed-in account, used to rehydrate on boot. */
export function fetchMe(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me');
}

/** Revoke the current session server-side. */
export function logout(): Promise<{ loggedOut: boolean }> {
  return apiPost<{ loggedOut: boolean }>('/auth/logout');
}

/** Every device this account has signed in from. */
export async function fetchSessions(): Promise<AuthSession[]> {
  const data = await apiGet<{ items: AuthSession[] }>('/auth/sessions');
  return data.items;
}

/** Force one other device to sign out. */
export function revokeSession(sessionId: string): Promise<AuthSession> {
  return apiPost<AuthSession>(`/auth/sessions/${sessionId}/revoke`);
}
