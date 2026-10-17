import React from 'react';
import { useLoginPage } from '@/features/auth/context/loginPageContext';
import type { AuthSurface } from '@/features/auth/types';

interface AuthLegalNoticeProps {
  surface: AuthSurface;
}

const LEGAL_WRAPPER: Record<AuthSurface, string> = {
  desktop: 'auth-legal max-w-sm',
  mobile: 'auth-legal px-2',
};

/** Login disclaimer per surface, with links that open the terms modal. */
const LEGAL_TEXT: Record<AuthSurface, (openTerms: () => void) => React.ReactNode> = {
  desktop: (openTerms) => (
    <p className="auth-legal-text">
      <span>بالمتابعة، أنت توافق على </span>
      <button type="button" onClick={openTerms} className="auth-legal-link">شروط الاستخدام</button>
      <span> وسياسة </span>
      <button type="button" onClick={openTerms} className="auth-legal-link">الخصوصية</button>
      <span> الخاصة بأكاديمية خوارزم.</span>
    </p>
  ),
  mobile: (openTerms) => (
    <p className="auth-legal-text">
      بالمتابعة، أنت توافق على{' '}
      <button type="button" onClick={openTerms} className="auth-legal-link">
        شروط الاستخدام والسياسات
      </button>{' '}
      الخاصة بخدمة الأكاديمية الرقمية.
    </p>
  ),
};

/** Bottom disclaimer under the auth card. */
export const AuthLegalNotice: React.FC<AuthLegalNoticeProps> = ({ surface }) => {
  const { openTerms } = useLoginPage();
  return <div className={LEGAL_WRAPPER[surface]}>{LEGAL_TEXT[surface](openTerms)}</div>;
};
