import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { useAuth } from '@/features/auth/context/authContext';
import { getAccessToken, setTokens } from '@/shared/lib/authStorage';
import * as authFetchers from '@/features/auth/data/authFetchers';
import { EMPTY_AUTH_USER } from '@/features/auth/types';
import type { AuthConfig, AuthUser } from '@/features/auth/types';

vi.mock('@/features/auth/data/authFetchers', () => ({
  fetchAuthConfig: vi.fn(),
  fetchMe: vi.fn(),
  loginWithIdToken: vi.fn(),
  logout: vi.fn(),
  fetchSessions: vi.fn(),
  revokeSession: vi.fn(),
}));

vi.mock('@/features/auth/data/firebaseClient', () => ({
  firebaseIdToken: vi.fn(),
}));

const CONFIG: AuthConfig = {
  firebase: { apiKey: 'key', authDomain: 'demo.firebaseapp.com', projectId: 'demo' },
  providers: ['password', 'google', 'facebook'],
  devAuth: true,
};

const USER: AuthUser = {
  ...EMPTY_AUTH_USER,
  id: 'user-1',
  email: 'ahmad@example.com',
  fullName: 'أحمد',
};

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

const bootConfig = vi.mocked(authFetchers.fetchAuthConfig);
const bootMe = vi.mocked(authFetchers.fetchMe);
const signIn = vi.mocked(authFetchers.loginWithIdToken);
const signOutRequest = vi.mocked(authFetchers.logout);

describe('AuthProvider', () => {
  beforeEach(() => {
    bootConfig.mockResolvedValue(CONFIG);
  });

  it('boots as a visitor when no session is stored', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.user).toBeNull();
    expect(result.current.config).toEqual(CONFIG);
    expect(bootMe).not.toHaveBeenCalled();
  });

  it('rehydrates the stored session on boot', async () => {
    setTokens('stored-access', 'stored-refresh');
    bootMe.mockResolvedValue(USER);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).toEqual(USER));
    expect(bootMe).toHaveBeenCalledTimes(1);
  });

  it('drops a dead stored session instead of crashing the boot', async () => {
    setTokens('stored-access', 'stored-refresh');
    bootMe.mockRejectedValue(new Error('انتهت الجلسة.'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.user).toBeNull();
  });

  it('still boots when the API is unreachable', async () => {
    bootConfig.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.config).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('exchanges a dev token for the session and stores it', async () => {
    signIn.mockResolvedValue({ user: USER, accessToken: 'new-access', refreshToken: 'new-refresh' });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      await result.current.signIn('password', {
        screen: 'sign-in',
        email: 'ahmad@example.com',
        password: 'secret',
      });
    });

    expect(signIn).toHaveBeenCalledWith('dev:ahmad@example.com');
    expect(result.current.user).toEqual(USER);
    expect(getAccessToken()).toBe('new-access');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('refuses a dev sign-in without an email and leaves the form usable', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      await expect(
        result.current.signIn('password', { screen: 'sign-in', email: '', password: 'secret' })
      ).rejects.toThrow('الدخول التجريبي يتطلب إدخال البريد الإلكتروني.');
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('signs out and forgets the session even when the API call fails', async () => {
    setTokens('stored-access', 'stored-refresh');
    bootMe.mockResolvedValue(USER);
    signOutRequest.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(USER));

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});
