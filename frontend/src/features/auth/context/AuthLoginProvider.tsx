import React, { useState } from 'react';
import { useNavigate, useSearchParams } from '../../../app/routerContext';
import { NAV_TARGETS } from '../../../shared/lib/navigation';
import { DEFAULT_RETURNING_USER, type AuthMode } from '../types';
import { AuthLoginContext } from './authLoginContext';
import type { AuthLoginContextValue } from './authLoginContext';

/** Owns every piece of login page state so both surfaces read one source. */
export const AuthLoginProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mode can be initialized or controlled via URL ?mode=welcome-back
  const modeFromUrl = searchParams.get('mode') === 'welcome-back' ? 'welcome-back' : 'login';
  const [authMode, setAuthMode] = useState<AuthMode>(modeFromUrl);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const changeMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setSearchParams({ mode });
  };

  const completeAuth = () => {
    setToastMessage('تم تسجيل الدخول بنجاح! مرحبًا بك.');
    setTimeout(() => {
      navigate(NAV_TARGETS.dashboard);
    }, 800);
  };

  const value: AuthLoginContextValue = {
    authMode,
    user: DEFAULT_RETURNING_USER,
    toastMessage,
    showTermsModal,
    changeMode,
    completeAuth,
    openTerms: () => setShowTermsModal(true),
    closeTerms: () => setShowTermsModal(false),
    goHome: () => navigate(NAV_TARGETS.home),
  };

  return <AuthLoginContext.Provider value={value}>{children}</AuthLoginContext.Provider>;
};