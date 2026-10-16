import { createContext, useContext } from 'react';
import type { AuthScreen } from '@/features/auth/types';

export interface LoginPageContextValue {
  /** Sign in to an existing account, or create a new one. */
  screen: AuthScreen;
  showTermsModal: boolean;
  changeScreen: (screen: AuthScreen) => void;
  openTerms: () => void;
  closeTerms: () => void;
}

export const LoginPageContext = createContext<LoginPageContextValue | null>(null);

/** The login page's own UI state, kept out of the app-wide auth context. */
export function useLoginPage(): LoginPageContextValue {
  const value = useContext(LoginPageContext);
  if (!value) throw new Error('[auth] useLoginPage must be used inside LoginPageProvider.');
  return value;
}
