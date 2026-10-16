import { createContext, useContext } from 'react';
import type { AuthConfig, AuthProviderId, AuthScreen, AuthUser } from '@/features/auth/types';

/** What the credential form sends to `signIn`. */
export interface SignInCredentials {
  screen: AuthScreen;
  email: string;
  password: string;
  fullName?: string;
}

export interface AuthContextValue {
  /** The signed-in account, or null for a visitor. */
  user: AuthUser | null;
  /** Firebase client config + accepted providers; null until bootstrapped. */
  config: AuthConfig | null;
  /** True once the boot rehydrate finished, so guards can wait. */
  isReady: boolean;
  /** True while a sign-in request is in flight. */
  isSubmitting: boolean;
  /** A transient message: session lost, welcome, or an error. */
  notice: string | null;
  signIn: (provider: AuthProviderId, credentials?: SignInCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  setNotice: (message: string | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** The signed-in account and the actions that change it. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('[auth] useAuth must be used inside AuthProvider.');
  return value;
}
