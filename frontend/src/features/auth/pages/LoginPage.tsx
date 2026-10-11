import React from 'react';
import { AuthLoginProvider } from '../context/AuthLoginProvider';
import { AuthToast } from '../components/AuthToast';
import { AuthTermsModal } from '../components/AuthTermsModal';
import { DesktopLoginView } from '../components/LoginView/DesktopLoginView';
import { MobileLoginView } from '../components/LoginView/MobileLoginView';

/** Owns the shared auth state; each surface renders its own view on top of it. */
export const LoginPage: React.FC = () => (
  <AuthLoginProvider>
    <div className="auth-shell">
      <AuthToast />
      <DesktopLoginView />
      <MobileLoginView />
      <AuthTermsModal />
    </div>
  </AuthLoginProvider>
);