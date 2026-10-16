import React from 'react';
import { useRouter } from '@/app/routerContext';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import { AuthHeroPanel } from '@/features/auth/components/hero/AuthHeroPanel';
import { AuthTopBar } from '@/features/auth/components/chrome/AuthTopBar';
import { AuthLegalNotice } from '@/features/auth/components/chrome/AuthLegalNotice';
import { LoginCard } from '@/features/auth/components/cards/LoginCard';

/** Desktop split-screen surface: hero panel right, auth card chamber left. */
export const DesktopLoginView: React.FC = () => {
  const { navigate } = useRouter();
  const goHome = () => navigate(NAV_TARGETS.home);

  return (
    <div className="auth-split-screen">
      {/* Hero panel, right in RTL */}
      <div className="w-[640px] xl:w-[704px] h-full">
        <AuthHeroPanel onLogoClick={goHome} />
      </div>

      {/* Dedicated authentication card chamber, end in RTL */}
      <div className="auth-chamber">
        <AuthTopBar surface="desktop" />
        <div className="auth-card-slot animate-pop-in">
          <LoginCard variant="desktop" />
        </div>
        <AuthLegalNotice surface="desktop" />
      </div>
    </div>
  );
};
