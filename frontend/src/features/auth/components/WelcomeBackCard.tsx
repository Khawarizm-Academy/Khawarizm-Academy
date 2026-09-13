import React from 'react';
import type { ReturningUserData } from '../types';
import { AuthSocialButton } from './AuthSocialButton';

interface WelcomeBackCardProps {
  user: ReturningUserData;
  variant?: 'desktop' | 'mobile';
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
    <div className="w-full bg-[#061A3A] rounded-2xl p-6 sm:p-10 border border-[#1B3F80] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.3)] flex flex-col justify-start items-center gap-7 sm:gap-8 transition-all duration-300">
      {/* 1. Avatar & Greeting Section */}
      <div className="flex flex-col items-center gap-3.5 sm:gap-4 text-center">
        {/* Illuminated Gold Avatar Frame */}
        <div className="relative w-20 h-20 rounded-full p-0.5 bg-gradient-to-tr from-[#C88A32] via-[#E5B65C] to-[#F3CE7A] shadow-[0_0_18px_rgba(229,182,92,0.6)] flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-[#092557] overflow-hidden flex items-center justify-center border border-[#E5B65C]/60">
            {!avatarError ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-full h-full bg-[#061A3A] flex items-center justify-center text-xl font-bold text-[#E5B65C]">
                {user.name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* User Titles */}
        <div className="flex flex-col items-center gap-1.5">
          <h2 className="text-2xl font-bold text-[#DCE5EE] font-['Cairo',sans-serif]">
            {user.name}
          </h2>
          <div className="px-2.5 py-0.5 rounded bg-[#E5B65C]/15 border border-[#E5B65C]/30 inline-flex items-center">
            <span className="text-[#E5B65C] text-xs font-bold font-['Tajawal',sans-serif]">
              {user.title}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Special: Quick Stats Bar embedded inside card for 1-column screens */}
      {isMobile && (
        <div className="w-full py-2.5 px-4 rounded-xl bg-[#040F24]/80 border border-[#1B3F80]/50 flex items-center justify-around select-none">
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-[#E5B65C] font-['Cairo',sans-serif]">
              {user.activeCoursesCount} دورات مستمرة
            </span>
            <span className="text-[11px] text-[#8299B5] font-['Tajawal',sans-serif]">
              قيد التقدم
            </span>
          </div>
          <div className="w-[1px] h-6 bg-[#1B3F80]" aria-hidden="true" />
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-[#29A9FF] font-['Cairo',sans-serif]">
              {user.savedScholarshipsCount} منح محفوظة
            </span>
            <span className="text-[11px] text-[#8299B5] font-['Tajawal',sans-serif]">
              متاحة للتسجيل
            </span>
          </div>
        </div>
      )}

      {/* 2. Quick Connect Social Actions */}
      <div className="w-full flex flex-col gap-3">
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

      {/* 3. Switch Account Link */}
      <div className="pt-1 flex items-center justify-center">
        <button
          type="button"
          onClick={onSwitchToEmail}
          className="text-sm font-medium text-[#8299B5] hover:text-[#DCE5EE] hover:underline transition-colors font-['Tajawal',sans-serif] cursor-pointer"
        >
          استخدام بريد إلكتروني آخر
        </button>
      </div>
    </div>
  );
};
