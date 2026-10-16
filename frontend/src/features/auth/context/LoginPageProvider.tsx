import React, { useState } from 'react';
import { LoginPageContext } from '@/features/auth/context/loginPageContext';
import type { LoginPageContextValue } from '@/features/auth/context/loginPageContext';
import type { AuthScreen } from '@/features/auth/types';

/** Owns the login page's screen toggle and terms modal, shared by both surfaces. */
export const LoginPageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<AuthScreen>('sign-in');
  const [showTermsModal, setShowTermsModal] = useState(false);

  const value: LoginPageContextValue = {
    screen,
    showTermsModal,
    changeScreen: setScreen,
    openTerms: () => setShowTermsModal(true),
    closeTerms: () => setShowTermsModal(false),
  };

  return <LoginPageContext.Provider value={value}>{children}</LoginPageContext.Provider>;
};
