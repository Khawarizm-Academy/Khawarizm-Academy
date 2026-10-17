import React from 'react';
import { useRouter } from '@/app/routerContext';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import { AuthTopBar } from '@/features/auth/components/chrome/AuthTopBar';
import { AuthLegalNotice } from '@/features/auth/components/chrome/AuthLegalNotice';
import { LoginCard } from '@/features/auth/components/cards/LoginCard';
import { BrandSeal } from '@/features/auth/components/hero/BrandSeal';

/** One-column mobile surface: brand seal header on top, auth card below. */
export const MobileLoginView: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="auth-mobile">
      {/* Background radial gold glow */}
      <div className="auth-glow-mobile" aria-hidden="true" />

      <AuthTopBar surface="mobile" />

      {/* Centered Mobile Brand Seal & Headline */}
      <div className="auth-mobile-brand">
        <BrandSeal onClick={() => navigate(NAV_TARGETS.home)} />

        <div className="auth-mobile-heading">
          <h1 className="auth-mobile-title">أكاديمية خوارزم</h1>
          <p className="auth-mobile-subtitle">تعلّم مهارة، أو اعثر على منحتك القادمة</p>
        </div>
      </div>

      {/* Mobile Auth Body */}
      <div className="auth-body animate-pop-in">
        <LoginCard variant="mobile" />
        <AuthLegalNotice surface="mobile" />
      </div>
    </div>
  );
};
