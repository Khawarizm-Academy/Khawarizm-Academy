import React, { useState } from 'react';
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
    <div className="w-full bg-[#061A3A] rounded-2xl p-6 sm:p-9 border border-[#1B3F80] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.3)] flex flex-col justify-start items-stretch gap-6 sm:gap-7 transition-all duration-300">
      {/* 1. Welcome Header */}
      <div className="flex flex-col items-end text-right gap-1.5">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#DCE5EE] font-['Cairo',sans-serif]">
          {isDesktop ? 'مرحبًا بك في خوارزم' : 'مرحبًا بك'}
        </h2>
        <p className="text-xs sm:text-sm text-[#8299B5] font-['Tajawal',sans-serif]">
          {isDesktop
            ? 'سجّل دخولك لمتابعة رحلة تعلّمك الرقمية'
            : 'سجّل دخولك للمتابعة والوصول للدروس'}
        </p>
      </div>

      {/* 2. Social OAuth Buttons */}
      <div className="flex flex-col gap-3">
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

      {/* 3. Divider Row */}
      <div className="flex items-center gap-3 select-none" aria-hidden="true">
        <div className="flex-1 h-[1px] bg-[#1B3F80]" />
        <span className="text-xs text-[#8299B5] font-medium font-['Tajawal',sans-serif] px-1">
          أو
        </span>
        <div className="flex-1 h-[1px] bg-[#1B3F80]" />
      </div>

      {/* 4. Credentials Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="auth-email"
            className="text-xs font-bold text-[#DCE5EE] font-['Cairo',sans-serif] text-right"
          >
            البريد الإلكتروني
          </label>
          <div
            className={`w-full h-12 px-4 bg-[#040F24] rounded-lg border ${
              error
                ? 'border-[#D9534F] ring-1 ring-[#D9534F]'
                : 'border-[#1B3F80] focus-within:border-[#29A9FF] focus-within:ring-1 focus-within:ring-[#29A9FF]'
            } flex items-center justify-between transition-all duration-200`}
          >
            <input
              id="auth-email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="username@example.com"
              className="flex-1 bg-transparent text-sm text-[#DCE5EE] placeholder-[#5C7291] outline-none font-['Tajawal',sans-serif] text-left pr-2"
              autoComplete="email"
            />
            <div className="text-[#8299B5]" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M14.6672 4.66701L8.67275 8.48462C8.46933 8.60275 8.23827 8.66498 8.00303 8.66498C7.76778 8.66498 7.53673 8.60275 7.33331 8.48462L1.33282 4.66701M2.66626 2.66721H13.3338C14.0702 2.66721 14.6672 3.2641 14.6672 4.00041V11.9996C14.6672 12.7359 14.0702 13.3328 13.3338 13.3328H2.66626C1.92983 13.3328 1.33282 12.7359 1.33282 11.9996V4.00041C1.33282 3.2641 1.92983 2.66721 2.66626 2.66721Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          {error && (
            <p className="text-xs text-[#D9534F] font-['Tajawal',sans-serif] text-right mt-0.5">
              {error}
            </p>
          )}
        </div>

        {/* Primary CTA Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-gold w-full h-12 rounded-lg text-base font-bold font-['Cairo',sans-serif] flex-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
        >
          {isLoading ? (
            <span className="inline-block w-5 h-5 border-2 border-[#040F24] border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>متابعة</span>
          )}
        </button>

        {/* Demo Switch Option: Returning User Preview */}
        {onSwitchToReturningUser && (
          <div className="pt-1 flex-center">
            <button
              type="button"
              onClick={onSwitchToReturningUser}
              className="text-xs text-[#E5B65C] hover:text-white hover:underline transition-colors font-['Tajawal',sans-serif] cursor-pointer inline-flex items-center gap-1.5"
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
