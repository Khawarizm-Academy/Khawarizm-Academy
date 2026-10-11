import React from 'react';
import { useAuthLogin } from '../../context/authLoginContext';
import { AuthTopBar } from '../AuthTopBar';
import { AuthLegalNotice } from '../AuthLegalNotice';
import { ActiveAuthCard } from '../ActiveAuthCard';
import { BrandSeal } from '../BrandSeal';

/** One-column mobile surface: brand seal header on top, auth card below. */
export const MobileLoginView: React.FC = () => {
  const { authMode, goHome } = useAuthLogin();

  return (
    <div className="auth-mobile">
      {/* Background radial gold glow */}
      <div className="auth-glow-mobile" aria-hidden="true" />

      <AuthTopBar surface="mobile" />

      {/* Centered Mobile Brand Seal & Headline */}
      <div className="auth-mobile-brand">
        <BrandSeal onClick={goHome} />

        <div className="auth-mobile-heading">
          <h1 className="auth-mobile-title">أكاديمية خوارزم</h1>
          <p className="auth-mobile-subtitle">تعلّم مهارة، أو اعثر على منحتك القادمة</p>
        </div>
      </div>

      {/* Mobile Auth Body */}
      <div key={`mobile-${authMode}`} className="auth-body animate-pop-in">
        <ActiveAuthCard surface="mobile" />
        <AuthLegalNotice surface="mobile" />
      </div>
    </div>
  );
};