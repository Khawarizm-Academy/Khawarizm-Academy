import React, { useCallback, useEffect, useState } from 'react';
import { clearTokens, getAccessToken, setTokens } from '@/shared/lib/authStorage';
import { setAuthLostHandler } from '@/shared/lib/apiClient';
import { fetchAuthConfig, fetchMe, loginWithIdToken, logout } from '@/features/auth/data/authFetchers';
import { firebaseIdToken } from '@/features/auth/data/firebaseClient';
import { AuthContext } from '@/features/auth/context/authContext';
import { SESSION_LOST_MESSAGES } from '@/features/auth/types';
import type { SignInCredentials } from '@/features/auth/context/authContext';
import type { AuthConfig, AuthProviderId, AuthUser } from '@/features/auth/types';

/** In development the API accepts `dev:<email>` in place of a Firebase token. */
function devToken(credentials?: SignInCredentials): string {
  if (!credentials?.email) {
    throw new Error('الدخول التجريبي يتطلب إدخال البريد الإلكتروني.');
  }
  return `dev:${credentials.email}`;
}

/** Owns the signed-in account so any component can read or change it. */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Bootstrap: load the Firebase config and rehydrate the stored session.
  useEffect(() => {
    let active = true;

    // A dead session (expired, revoked, or signed in elsewhere) signs the reader out.
    setAuthLostHandler((code) => {
      if (!active) return;
      setUser(null);
      setNotice(SESSION_LOST_MESSAGES[code] ?? SESSION_LOST_MESSAGES.session_expired);
    });

    (async () => {
      const loadedConfig = await fetchAuthConfig().catch(() => null);
      if (active && loadedConfig) setConfig(loadedConfig);

      if (getAccessToken()) {
        const me = await fetchMe().catch(() => null);
        if (active && me) setUser(me);
      }
      if (active) setIsReady(true);
    })();

    return () => {
      active = false;
      setAuthLostHandler(null);
    };
  }, []);

  const signIn = useCallback(
    async (provider: AuthProviderId, credentials?: SignInCredentials) => {
      setIsSubmitting(true);
      try {
        const activeConfig = config ?? (await fetchAuthConfig());
        if (!config) setConfig(activeConfig);

        const idToken =
          activeConfig.devAuth && provider === 'password'
            ? devToken(credentials)
            : await firebaseIdToken(activeConfig, provider, credentials);

        const result = await loginWithIdToken(idToken);
        setTokens(result.accessToken, result.refreshToken);
        setUser(result.user);
        setNotice('تم تسجيل الدخول بنجاح! مرحبًا بك.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [config]
  );

  const signOut = useCallback(async () => {
    await logout().catch(() => undefined);
    clearTokens();
    setUser(null);
    setNotice(null);
  }, []);

  const value = { user, config, isReady, isSubmitting, notice, signIn, signOut, setNotice };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
