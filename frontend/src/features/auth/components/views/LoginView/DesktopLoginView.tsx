import React from 'react';
import { useAuthLogin } from '@/features/auth/context/authLoginContext';
import { AuthHeroPanel } from '@/features/auth/components/hero/AuthHeroPanel';
import { AuthTopBar } from '@/features/auth/components/chrome/AuthTopBar';
import { AuthLegalNotice } from '@/features/auth/components/chrome/AuthLegalNotice';
import { ActiveAuthCard } from '@/features/auth/components/cards/ActiveAuthCard';

/** Desktop split-screen surface: hero panel right, auth card chamber left. */
export const DesktopLoginView: React.FC = () => {
  const { authMode, user, goHome } = useAuthLogin();

  return (
    <div className="auth-split-screen">
      {/* Hero panel, right in RTL */}
      <div className="w-[640px] xl:w-[704px] h-full">
        <AuthHeroPanel mode={authMode} user={user} onLogoClick={goHome} />
      </div>

      {/* Dedicated authentication card chamber, end in RTL */}
      <div className="auth-chamber">
        <AuthTopBar surface="desktop" />

        {/* Active Card — remounts with a spring pop when the mode switches */}
        <div key={`desktop-${authMode}`} className="auth-card-slot animate-pop-in">
          <ActiveAuthCard surface="desktop" />
        </div>

        <AuthLegalNotice surface="desktop" />
      </div>
    </div>
  );
};