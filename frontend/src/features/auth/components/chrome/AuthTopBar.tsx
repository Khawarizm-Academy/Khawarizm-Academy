import React from 'react';
import { useAuthLogin } from '@/features/auth/context/authLoginContext';
import { AuthModeSwitch } from '@/features/auth/components/controls/AuthModeSwitch';
import type { AuthSurface } from '@/features/auth/types';

interface AuthTopBarProps {
  surface: AuthSurface;
}

/** Back-link label and wrapper per surface; the mode pill switcher is shared. */
const TOP_BAR: Record<AuthSurface, { className: string; backLabel: string; backTitle?: string }> = {
  desktop: {
    className: 'auth-top-bar',
    backLabel: 'العودة للرئيسية',
    backTitle: 'العودة للصفحة الرئيسية',
  },
  mobile: { className: 'auth-top-bar max-w-md mb-4', backLabel: 'الرئيسية' },
};

/** Top chrome: return-home link + demo mode switcher, one component for both surfaces. */
export const AuthTopBar: React.FC<AuthTopBarProps> = ({ surface }) => {
  const { authMode, changeMode, goHome } = useAuthLogin();
  const config = TOP_BAR[surface];

  return (
    <div className={config.className}>
      <button onClick={goHome} className="auth-back-link" title={config.backTitle} type="button">
        <span>←</span>
        <span>{config.backLabel}</span>
      </button>
      <AuthModeSwitch mode={authMode} onChange={changeMode} />
    </div>
  );
};