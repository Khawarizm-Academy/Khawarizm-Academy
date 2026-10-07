import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { AuthSocialButton } from './AuthSocialButton';

interface DefaultLoginCardProps {
  variant?: 'desktop' | 'mobile';
  onSubmitEmail?: (email: string) => void;
  onSwitchToReturningUser?: () => void;
}

export const DefaultLoginCard: React.FC<DefaultLoginCardProps> = ({
  variant = 'desktop',
  onSubmitEmail,
  onSwitchToReturningUser,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('يرجى إدخال عنوان البريد الإلكتروني');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    setError(null);
    setIsLoading(true);

    // Simulate login / email submit
    setTimeout(() => {
      setIsLoading(false);
      onSubmitEmail?.(email);
    }, 400);
  };

  const isDesktop = variant === 'desktop';

  return (
    <div className="auth-card items-stretch gap-6 sm:gap-7">
      {/* Welcome Header */}
      <div className="auth-card-head">
        <h2 className="auth-card-title">
          {isDesktop ? 'مرحبًا بك في خوارزم' : 'مرحبًا بك'}
        </h2>
        <p className="auth-card-subtitle">
          {isDesktop
            ? 'سجّل دخولك لمتابعة رحلة تعلّمك الرقمية'
            : 'سجّل دخولك للمتابعة والوصول للدروس'}
        </p>
      </div>

      {/* Social OAuth Buttons */}
      <div className="auth-social-stack">
        <AuthSocialButton
          provider="google"
          label="المتابعة مع Google"
          onClick={() => onSubmitEmail?.('google-user@example.com')}
        />
        <AuthSocialButton
          provider="facebook"
          label="المتابعة مع Facebook"
          onClick={() => onSubmitEmail?.('facebook-user@example.com')}
        />
      </div>

      {/* Divider Row */}
      <div className="auth-divider" aria-hidden="true">
        <div className="auth-divider-line" />
        <span className="auth-divider-label">أو</span>
        <div className="auth-divider-line" />
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="auth-email" className="auth-label">
            البريد الإلكتروني
          </label>
          <div
            className={`auth-input-wrap ${error ? 'auth-input-wrap-error' : ''}`}
            onClick={() => document.getElementById('auth-email')?.focus()}
          >
            {/* Mail icon sits at the start edge (right) in RTL */}
            <div className="auth-input-icon" aria-hidden="true">
              <Mail size={18} />
            </div>

            <input
              id="auth-email"
              type="email"
              dir="auto"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="username@example.com"
              className="auth-input"
              autoComplete="email"
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
        </div>

        {/* Primary CTA Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-gold w-full h-12 text-base disabled:opacity-50"
        >
          {isLoading ? (
            <span className="inline-block w-5 h-5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>متابعة</span>
          )}
        </button>

        {/* Returning-user quick preview */}
        {onSwitchToReturningUser && (
          <div className="auth-link-slot">
            <button
              type="button"
              onClick={onSwitchToReturningUser}
              className="auth-link-gold"
            >
              <span>تسجيل دخول سريع لطالب مسجل مسبقاً (أحمد الغامدي)</span>
              <span>←</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
