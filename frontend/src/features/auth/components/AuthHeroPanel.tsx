import React from 'react';
import type { AuthMode, ReturningUserData } from '../types';
import brandIcon from '../../../assets/brand/generated/icon-192.png';

interface AuthHeroPanelProps {
  mode: AuthMode;
  user?: ReturningUserData;
  onLogoClick?: () => void;
}

export const AuthHeroPanel: React.FC<AuthHeroPanelProps> = ({
  mode,
  user,
  onLogoClick,
}) => {
  const isWelcomeBack = mode === 'welcome-back';

  return (
    <div className="relative w-full h-full p-10 lg:p-16 bg-gradient-to-br from-[#061A3A]/80 via-[#061A3A]/90 to-[#040F24]/95 flex flex-col justify-between items-end overflow-hidden select-none">
      {/* 1. Atmospheric Celestial Glows */}
      <div
        className="absolute top-[80px] left-[100px] w-[500px] h-[500px] rounded-full pointer-events-none opacity-40 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, rgba(229,182,92,0.3) 0%, rgba(229,182,92,0) 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute top-[200px] -left-[60px] w-[600px] h-[600px] rounded-full pointer-events-none opacity-30 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, rgba(41,169,255,0.25) 0%, rgba(41,169,255,0) 70%)',
        }}
        aria-hidden="true"
      />

      {/* 2. Top Header Brand Seal & Academy Name */}
      <div
        onClick={onLogoClick}
        className="relative z-10 inline-flex items-center gap-4 cursor-pointer group transition-transform duration-300 hover:scale-[1.02]"
        title="العودة للصفحة الرئيسية"
      >
        <div className="flex flex-col items-end text-right">
          <span className="text-2xl font-bold text-[#E5B65C] font-['Cairo',sans-serif] group-hover:text-white transition-colors">
            أكاديمية خوارزم
          </span>
          <span className="text-xs text-[#8299B5] tracking-wider font-['Tajawal',sans-serif]">
            KHAWARIZM ACADEMY
          </span>
        </div>

        {/* 64px Illuminated Brand Ring */}
        <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-[#E5B65C] via-[#092557] to-[#C88A32] shadow-[0_0_16px_rgba(229,182,92,0.4)] flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-[#061A3A] overflow-hidden flex items-center justify-center border border-[#E5B65C]/50">
            <img
              src={brandIcon}
              alt="أكاديمية خوارزم"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* 3. Middle Dynamic Astrolabe Orbit Artwork */}
      <div className="relative z-10 w-full py-8 flex flex-col items-center justify-center">
        <div className="relative w-72 sm:w-80 h-72 sm:h-80 flex items-center justify-center">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border border-[#E5B65C]/25 animate-spin-very-slow pointer-events-none" />

          {/* Middle Ring */}
          <div className="absolute inset-8 sm:inset-10 rounded-full border border-[#29A9FF]/30 pointer-events-none" />

          {/* Coordinate Orbit Lines */}
          <div
            className="absolute w-full h-0 border-t border-[#1B3F80]/40 pointer-events-none"
            style={{ transform: 'rotate(30deg)' }}
          />
          <div
            className="absolute w-full h-0 border-t border-[#1B3F80]/40 pointer-events-none"
            style={{ transform: 'rotate(120deg)' }}
          />

          {/* Radiant Central Astrolabe Core with Golden Starlight */}
          <div className="relative z-20 w-14 h-14 rounded-full flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#E5B65C] opacity-40 blur-md animate-pulse" />
            <div className="relative w-7 h-7 rounded-full bg-gradient-to-tr from-[#C88A32] to-[#E5B65C] shadow-[0_0_24px_#E5B65C]" />
          </div>
        </div>
      </div>

      {/* 4. Bottom Taglines and Stats */}
      <div className="relative z-10 w-full flex flex-col items-end gap-6 text-right">
        {!isWelcomeBack ? (
          <>
            {/* Default Tagline Group */}
            <div className="flex flex-col items-end gap-3 max-w-xl">
              <h1 className="text-3xl lg:text-4xl font-bold text-[#DCE5EE] leading-tight font-['Cairo',sans-serif]">
                تعلّم مهارة غدٍ، أو اعثر على منحتك القادمة
              </h1>
              <p className="text-sm lg:text-base text-[#8299B5] leading-relaxed font-['Tajawal',sans-serif]">
                بوابتك الذكية لفرص التعليم العالمي والتمكين التقني في العالم العربي. صممت خوارزم لترافق خطوات تميزك الأكاديمي.
              </p>
            </div>

            {/* Trust Shield Badge */}
            <div className="inline-flex items-center gap-2 pt-2">
              <span className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
                نظام تشفير معتمد وحماية بيانات كاملة
              </span>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  d="M5.25018 6.99972L6.41673 8.16643L8.74983 5.83302M11.6662 7.58334C11.6662 10.5001 9.62474 11.9585 7.19831 12.8043C7.07126 12.8474 6.93324 12.8453 6.80752 12.7985C4.37526 11.9585 2.3338 10.5001 2.3338 7.58334V3.49987C2.3338 3.34516 2.39525 3.19678 2.50464 3.08738C2.61402 2.97798 2.76238 2.91652 2.91708 2.91652C4.08363 2.91652 5.54181 2.21649 6.55671 1.3298C6.68028 1.22421 6.83747 1.1662 7 1.1662C7.16253 1.1662 7.31972 1.22421 7.44329 1.3298C8.46402 2.22233 9.91638 2.91652 11.0829 2.91652C11.2376 2.91652 11.386 2.97798 11.4954 3.08738C11.6047 3.19678 11.6662 3.34516 11.6662 3.49987V7.58334Z"
                  stroke="#29A9FF"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </>
        ) : (
          <>
            {/* Returning User Tagline Group */}
            <div className="flex flex-col items-end gap-3 max-w-xl">
              <h1 className="text-4xl lg:text-5xl font-bold text-[#DCE5EE] leading-tight font-['Cairo',sans-serif]">
                أهلاً بعودتك من جديد!
              </h1>
              <p className="text-base lg:text-lg text-[#8299B5] leading-relaxed font-['Tajawal',sans-serif]">
                مستعد لمتابعة رحلة التعلم؟ مجموعتك المفضلة من الكورسات والمنح تنتظرك لتأخذ خطوتك التالية اليوم.
              </p>
            </div>

            {/* Returning User Quick Stats Row */}
            <div className="inline-flex items-center gap-8 pt-2">
              <div className="flex flex-col items-end">
                <span className="text-xl font-bold text-[#E5B65C] font-['Cairo',sans-serif]">
                  {user?.activeCoursesCount ?? 3} دورات مستمرة
                </span>
                <span className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
                  قيد التقدم
                </span>
              </div>

              <div className="w-[1px] h-7 bg-[#1B3F80]" aria-hidden="true" />

              <div className="flex flex-col items-end">
                <span className="text-xl font-bold text-[#29A9FF] font-['Cairo',sans-serif]">
                  {user?.savedScholarshipsCount ?? 5} منح محفوظة
                </span>
                <span className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
                  متاحة للتسجيل
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
