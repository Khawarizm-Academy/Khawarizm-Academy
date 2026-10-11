import React from 'react';
import { AuthLoginProvider } from '@/features/auth/context/AuthLoginProvider';
import { AuthToast } from '@/features/auth/components/overlays/AuthToast';
import { AuthTermsModal } from '@/features/auth/components/overlays/AuthTermsModal';
import { DesktopLoginView } from '@/features/auth/components/views/LoginView/DesktopLoginView';
import { MobileLoginView } from '@/features/auth/components/views/LoginView/MobileLoginView';

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