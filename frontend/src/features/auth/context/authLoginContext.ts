import { createContext, useContext } from 'react';
import type { AuthMode, ReturningUserData } from '../types';

export interface AuthLoginContextValue {
  authMode: AuthMode;
  user: ReturningUserData;
  toastMessage: string | null;
  showTermsModal: boolean;
  changeMode: (mode: AuthMode) => void;
  completeAuth: () => void;
  openTerms: () => void;
  closeTerms: () => void;
  goHome: () => void;
}

export const AuthLoginContext = createContext<AuthLoginContextValue | null>(null);

/** Every piece of login state the surfaces share, without prop drilling. */
export function useAuthLogin(): AuthLoginContextValue {
  const value = useContext(AuthLoginContext);
  if (!value) throw new Error('[auth] useAuthLogin must be used inside AuthLoginProvider.');
  return value;
}