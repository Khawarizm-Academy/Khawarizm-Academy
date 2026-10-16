import React from 'react';
import { useRouter } from '@/app/routerContext';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import type { AuthSurface } from '@/features/auth/types';

interface AuthTopBarProps {
  surface: AuthSurface;
}

/** Back-link label and wrapper per surface. */
const TOP_BAR: Record<AuthSurface, { className: string; backLabel: string; backTitle?: string }> = {
  desktop: {
    className: 'auth-top-bar',
    backLabel: 'العودة للرئيسية',
    backTitle: 'العودة للصفحة الرئيسية',
  },
  mobile: { className: 'auth-top-bar max-w-md mb-4', backLabel: 'الرئيسية' },
};

/** Top chrome: a return-home link, one component for both surfaces. */
export const AuthTopBar: React.FC<AuthTopBarProps> = ({ surface }) => {
  const { navigate } = useRouter();
  const config = TOP_BAR[surface];

  return (
    <div className={config.className}>
      <button
        onClick={() => navigate(NAV_TARGETS.home)}
        className="auth-back-link"
        title={config.backTitle}
        type="button"
      >
        <span>←</span>
        <span>{config.backLabel}</span>
      </button>
    </div>
  );
};
