import React from 'react';
import { ShieldCheck } from 'lucide-react';
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
          <span className="text-2xl font-bold text-[#E5B65C] font-['IBM_Plex_Sans_Arabic'] group-hover:text-white transition-colors">
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
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-100 leading-tight font-['IBM_Plex_Sans_Arabic']">
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
<ShieldCheck size={16} className="text-sky-400" />
            </div>
          </>
        ) : (
          <>
            {/* Returning User Tagline Group */}
            <div className="flex flex-col items-end gap-3 max-w-xl">
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-100 leading-tight font-['IBM_Plex_Sans_Arabic']">
                أهلاً بعودتك من جديد!
              </h1>
              <p className="text-base lg:text-lg text-[#8299B5] leading-relaxed font-['Tajawal',sans-serif]">
                مستعد لمتابعة رحلة التعلم؟ مجموعتك المفضلة من الكورسات والمنح تنتظرك لتأخذ خطوتك التالية اليوم.
              </p>
            </div>

            {/* Returning User Quick Stats Row */}
            <div className="inline-flex items-center gap-8 pt-2">
              <div className="flex flex-col items-end">
                <span className="text-xl font-bold text-[#E5B65C] font-['IBM_Plex_Sans_Arabic']">
                  {user?.activeCoursesCount ?? 3} دورات مستمرة
                </span>
                <span className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
                  قيد التقدم
                </span>
              </div>

              <div className="w-[1px] h-7 bg-[#1B3F80]" aria-hidden="true" />

              <div className="flex flex-col items-end">
                <span className="text-xl font-bold text-[#29A9FF] font-['IBM_Plex_Sans_Arabic']">
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
