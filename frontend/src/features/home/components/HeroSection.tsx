import React from 'react';
import { SmartSearchBox } from '../../../shared/components/Search/SmartSearchBox';

interface HeroSectionProps {
  variant?: 'desktop' | 'mobile';
  onSearch?: (query: string, type: 'course' | 'scholarship' | 'all') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  variant = 'desktop',
  onSearch,
}) => {
  if (variant === 'mobile') {
    return (
      <section className="w-full pt-8 pb-4 flex flex-col items-center text-center relative">
        {/* Mobile Astrolabe Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#29A9FF]/10 rounded-full blur-3xl pointer-events-none" />

        {/* 2-Line Headline matching Mobile Screenshot */}
        <h2 className="text-3xl font-bold font-['IBM_Plex_Sans_Arabic'] leading-tight mb-6 text-[#DCE5EE] tracking-tight">
          اكتشف <span className="text-[#29A9FF]">مهاراتك</span>
          <br />
          واحصل على <span className="text-[#E5B65C]">منحتك</span>
        </h2>

        {/* Mobile Smart Search Box */}
        <SmartSearchBox variant="mobile" onSearch={onSearch} />
      </section>
    );
  }

  // Desktop Variant matching Desktop Screenshot
  return (
    <section className="w-full py-16 flex flex-col items-center text-center relative">
      {/* Background Starfield and Radial Atmospheric Glows */}
      <div className="absolute inset-0 space-stars-bg opacity-70 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-radial from-[#29A9FF]/10 via-[#E5B65C]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Main Headline */}
      <h1 className="text-5xl lg:text-6xl font-extrabold font-['IBM_Plex_Sans_Arabic'] text-[#DCE5EE] mb-4 tracking-tight leading-[1.2]">
        اكتشف <span className="text-[#E5B65C]">آفاقاً جديدة للتعلم</span>
      </h1>

      {/* Subtitle */}
      <p className="text-base sm:text-lg text-[#8299B5] font-['Tajawal'] max-w-2xl mx-auto mb-10 leading-relaxed">
        مرصدك الشخصي للعلم والمعرفة. استكشف آلاف الدورات والمنح الدراسية المصممة
        <br className="hidden sm:inline" />
        لتمكين مستقبلك التقني والأكاديمي.
      </p>

      {/* Desktop Smart Search Box */}
      <SmartSearchBox variant="desktop" onSearch={onSearch} />
    </section>
  );
};
