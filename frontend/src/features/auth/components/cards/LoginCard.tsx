import React, { useState } from 'react';
import { Lock, Mail, User } from 'lucide-react';
import { useRouter } from '@/app/routerContext';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import { ApiError } from '@/shared/lib/apiClient';
import { useAuth } from '@/features/auth/context/authContext';
import { useLoginPage } from '@/features/auth/context/loginPageContext';
import { AuthSocialButton } from '@/features/auth/components/controls/AuthSocialButton';
import type { AuthProviderId, AuthSurface } from '@/features/auth/types';

interface LoginCardProps {
  variant?: AuthSurface;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Human text for the errors the API and Firebase can raise. */
const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'auth/wrong-password': 'كلمة المرور غير صحيحة.',
  'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني.',
  'auth/email-already-in-use': 'هذا البريد الإلكتروني مسجّل بالفعل.',
  'auth/weak-password': 'كلمة المرور قصيرة جدًا (٦ أحرف على الأقل).',
  'auth/popup-closed-by-user': 'تم إغلاق نافذة الدخول قبل الإكمال.',
  'auth/network-request-failed': 'تعذر الوصول إلى خوادم تسجيل الدخول — تحقق من اتصالك بالإنترنت ثم أعد المحاولة.',
  'auth/popup-blocked': 'المتصفح منع نافذة الدخول — اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة.',
  'auth/cancelled-popup-request': 'صلة دخول معلّقة — انتظر ثوانٍ ثم أعد المحاولة.',
};

/** The one real auth card: credentials, social sign-in, and a create-account toggle. */
export const LoginCard: React.FC<LoginCardProps> = ({ variant = 'desktop' }) => {
  const { screen, changeScreen } = useLoginPage();
  const { signIn, isSubmitting, config } = useAuth();
  const { search, navigate } = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isDesktop = variant === 'desktop';
  const isRegister = screen === 'register';
  // Social sign-in needs a real Firebase project; dev mode only supports email.
  const socialDisabled = Boolean(config?.devAuth) || isSubmitting;

  /** Land on the page the reader came for, or the dashboard. */
  const goAfterAuth = () => {
    const next = new URLSearchParams(search).get('next');
    navigate(next ?? NAV_TARGETS.dashboard);
  };

  const describeError = (err: unknown): string => {
    if (err instanceof ApiError) return err.message;
    const code = (err as { code?: string }).code;
    return (code && ERROR_MESSAGES[code]) || 'تعذر إكمال تسجيل الدخول. حاول مرة أخرى.';
  };

  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister && !fullName.trim()) return setError('يرجى إدخال الاسم الكامل');
    if (!EMAIL_PATTERN.test(email)) return setError('يرجى إدخال بريد إلكتروني صحيح');
    if (password.length < 6) return setError('كلمة المرور يجب أن تكون ٦ أحرف على الأقل');

    setError(null);
    try {
      await signIn('password', { screen, email, password, fullName });
      goAfterAuth();
    } catch (err) {
      setError(describeError(err));
    }
  };

  const submitSocial = async (provider: AuthProviderId) => {
    setError(null);
    try {
      await signIn(provider);
      goAfterAuth();
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <div className="auth-card items-stretch gap-6 sm:gap-7">
      <div className="auth-card-head">
        <h2 className="auth-card-title">
          {isDesktop ? 'مرحبًا بك في خوارزم' : 'مرحبًا بك'}
        </h2>
        <p className="auth-card-subtitle">
          {isRegister ? 'أنشئ حسابك لمتابعة رحلتك التعليمية' : 'سجّل دخولك لمتابعة رحلة تعلّمك الرقمية'}
        </p>
      </div>

      <div className="auth-social-stack">
        <AuthSocialButton
          provider="google"
          label="المتابعة مع Google"
          onClick={() => submitSocial('google')}
          disabled={socialDisabled}
        />
        <AuthSocialButton
          provider="facebook"
          label="المتابعة مع Facebook"
          onClick={() => submitSocial('facebook')}
          disabled={socialDisabled}
        />
      </div>

      {config?.devAuth && (
        <p className="auth-hint">
          وضع التطوير: يعمل تسجيل الدخول بالبريد الإلكتروني مباشرة. أضف مفاتيح Firebase لتمكين Google و Facebook.
        </p>
      )}

      <div className="auth-divider" aria-hidden="true">
        <div className="auth-divider-line" />
        <span className="auth-divider-label">أو</span>
        <div className="auth-divider-line" />
      </div>

      <form onSubmit={submitCredentials} className="auth-form">
        {isRegister && (
          <div className="auth-field">
            <label htmlFor="auth-name" className="auth-label">الاسم الكامل</label>
            <div className={`auth-input-wrap ${error && !fullName ? 'auth-input-wrap-error' : ''}`}>
              <div className="auth-input-icon" aria-hidden="true"><User size={18} /></div>
              <input
                id="auth-name"
                type="text"
                dir="auto"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); if (error) setError(null); }}
                placeholder="أحمد الغامدي"
                className="auth-input"
                autoComplete="name"
              />
            </div>
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="auth-email" className="auth-label">البريد الإلكتروني</label>
          <div className={`auth-input-wrap ${error ? 'auth-input-wrap-error' : ''}`}>
            <div className="auth-input-icon" aria-hidden="true"><Mail size={18} /></div>
            <input
              id="auth-email"
              type="email"
              dir="auto"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
              placeholder="username@example.com"
              className="auth-input"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="auth-password" className="auth-label">كلمة المرور</label>
          <div className={`auth-input-wrap ${error ? 'auth-input-wrap-error' : ''}`}>
            <div className="auth-input-icon" aria-hidden="true"><Lock size={18} /></div>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
              placeholder="••••••••"
              className="auth-input"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-gold w-full h-12 text-base disabled:opacity-50">
          {isSubmitting ? (
            <span className="inline-block w-5 h-5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>{isRegister ? 'إنشاء الحساب' : 'تسجيل الدخول'}</span>
          )}
        </button>

        <div className="auth-link-slot">
          <button
            type="button"
            onClick={() => { setError(null); changeScreen(isRegister ? 'sign-in' : 'register'); }}
            className="auth-link-gold"
          >
            <span>{isRegister ? 'لديك حساب بالفعل؟ سجّل الدخول' : 'ليس لديك حساب؟ أنشئ حسابًا جديدًا'}</span>
            <span>←</span>
          </button>
        </div>
      </form>
    </div>
  );
};
