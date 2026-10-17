import React from 'react';
import { Navigate } from '@/app/Navigate';
import { useRouter } from '@/app/routerContext';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import { useAuth } from '@/features/auth/context/authContext';
import { LoginPageProvider } from '@/features/auth/context/LoginPageProvider';
import { AuthTermsModal } from '@/features/auth/components/overlays/AuthTermsModal';
import { DesktopLoginView } from '@/features/auth/components/views/LoginView/DesktopLoginView';
import { MobileLoginView } from '@/features/auth/components/views/LoginView/MobileLoginView';

/** Owns the shared auth state; each surface renders its own view on top of it. */
export const LoginPage: React.FC = () => {
  const { user, isReady } = useAuth();
  const { search } = useRouter();

  // Already signed in? Go straight to where the reader was headed.
  if (isReady && user) {
    const next = new URLSearchParams(search).get('next');
    return <Navigate to={next ?? NAV_TARGETS.dashboard} replace />;
  }

  return (
    <LoginPageProvider>
      <div className="auth-shell">
        <DesktopLoginView />
        <MobileLoginView />
        <AuthTermsModal />
      </div>
    </LoginPageProvider>
  );
};
