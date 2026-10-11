import React from 'react';
import { useAuthLogin } from '@/features/auth/context/authLoginContext';
import type { AuthSurface } from '@/features/auth/types';

interface AuthLegalNoticeProps {
  surface: AuthSurface;
}

const LEGAL_WRAPPER: Record<AuthSurface, string> = {
  desktop: 'auth-legal max-w-sm',
  mobile: 'auth-legal px-2',
};

/** Login-mode disclaimer per surface; the returning-user line is shared by both. */
const LOGIN_NOTICE: Record<AuthSurface, (openTerms: () => void) => React.ReactNode> = {
  desktop: (openTerms) => (
    <p className="auth-legal-text">
      <span>بإنشاء حساب، أنت توافق على </span>
      <button type="button" onClick={openTerms} className="auth-legal-link">
        شروط الاستخدام
      </button>
      <span> وسياسة </span>
      <button type="button" onClick={openTerms} className="auth-legal-link">
        الخصوصية
      </button>
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

/** Bottom disclaimer under the auth card; wording varies by mode and surface. */
export const AuthLegalNotice: React.FC<AuthLegalNoticeProps> = ({ surface }) => {
  const { authMode, openTerms } = useAuthLogin();

  if (authMode === 'welcome-back') {
    return (
      <div className={LEGAL_WRAPPER[surface]}>
        <p className="auth-legal-text">أكاديمية خوارزم · منصة التعلم الذاتي الرائدة</p>
      </div>
    );
  }

  return <div className={LEGAL_WRAPPER[surface]}>{LOGIN_NOTICE[surface](openTerms)}</div>;
};