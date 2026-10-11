import React from 'react';
import type { AuthSurface, ReturningUserData } from '../types';
import { AuthSocialButton } from './AuthSocialButton';

interface WelcomeBackCardProps {
  user: ReturningUserData;
  variant?: AuthSurface;
  onQuickLogin?: (provider: 'google' | 'facebook') => void;
  onSwitchToEmail?: () => void;
}

export const WelcomeBackCard: React.FC<WelcomeBackCardProps> = ({
  user,
  variant = 'desktop',
  onQuickLogin,
  onSwitchToEmail,
}) => {
  const [avatarError, setAvatarError] = React.useState(false);
  const isMobile = variant === 'mobile';

  return (
    <div className="auth-card sm:p-10 items-center gap-7 sm:gap-8">
      {/* Avatar & Greeting */}
      <div className="flex flex-col items-center gap-3.5 sm:gap-4 text-center">
        {/* Illuminated gold avatar frame */}
        <div className="auth-avatar">
          <div className="auth-avatar-inner">
            {!avatarError ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="auth-avatar-img"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="auth-avatar-fallback">{user.name.charAt(0)}</div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <h2 className="auth-user-name">{user.name}</h2>
          <span className="auth-user-badge">{user.title}</span>
        </div>
      </div>

      {/* Mobile one-column screens embed the stats inside the card */}
      {isMobile && (
        <div className="auth-stats-bar">
          <div className="auth-stat items-center">
            <span className="auth-stat-value text-sm text-gold-400">
              {user.activeCoursesCount} دورات مستمرة
            </span>
            <span className="auth-stat-label text-[11px]">قيد التقدم</span>
          </div>
          <div className="auth-stat-divider h-6" aria-hidden="true" />
          <div className="auth-stat items-center">
            <span className="auth-stat-value text-sm text-blue-400">
              {user.savedScholarshipsCount} منح محفوظة
            </span>
            <span className="auth-stat-label text-[11px]">متاحة للتسجيل</span>
          </div>
        </div>
      )}

      {/* Quick Connect Social Actions */}
      <div className="auth-social-stack">
        <AuthSocialButton
          provider="google"
          label="متابعة تسجيل الدخول مع Google"
          onClick={() => onQuickLogin?.('google')}
        />
        <AuthSocialButton
          provider="facebook"
          label="متابعة تسجيل الدخول مع Facebook"
          onClick={() => onQuickLogin?.('facebook')}
        />
      </div>

      {/* Switch Account Link */}
      <div className="auth-link-slot">
        <button type="button" onClick={onSwitchToEmail} className="auth-link-muted">
          استخدام بريد إلكتروني آخر
        </button>
      </div>
    </div>
  );
};
