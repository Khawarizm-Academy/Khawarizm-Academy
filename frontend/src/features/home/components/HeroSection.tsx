import React from 'react';
import { SmartSearchBox } from '../../../shared/components/Search/SmartSearchBox';
import { CelestialCanvas } from '../../../shared/components/Artwork/CelestialCanvas';

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
      <section className="w-full pt-6 pb-2 flex-col-center text-center relative overflow-hidden">
        {/* Dynamic Celestial Starfield Canvas in Background */}
        <CelestialCanvas className="absolute inset-0 pointer-events-none opacity-60" />

        {/* Mobile Astrolabe Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#29A9FF]/12 rounded-full blur-3xl pointer-events-none animate-celestial-pulse" />

        {/* 2-Line Headline matching Mobile Screenshot */}
        <h2 className="relative z-10 text-3xl sm:text-4xl font-bold font-['IBM_Plex_Sans_Arabic'] leading-tight mb-5 text-[#DCE5EE] tracking-tight">
          اكتشف <span className="text-[#29A9FF] drop-shadow-[0_0_12px_rgba(41,169,255,0.5)]">مهاراتك</span>
          <br />
          واحصل على <span className="text-[#E5B65C] drop-shadow-[0_0_12px_rgba(229,182,92,0.5)]">منحتك</span>
        </h2>

        {/* Mobile Smart Search Box */}
        <div className="relative z-10 w-full flex-center">
          <SmartSearchBox variant="mobile" onSearch={onSearch} />
        </div>
      </section>
    );
  }

  // Desktop Variant matching Desktop Screenshot
  return (
    <section className="w-full py-12 flex-col-center text-center relative overflow-hidden">
      {/* Dynamic Celestial Starfield Canvas in Background */}
      <CelestialCanvas className="absolute inset-0 pointer-events-none opacity-85" />

      {/* Atmospheric Star Texture & Radial Nebula Glow */}
      <div className="absolute inset-0 space-stars-bg opacity-40 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-radial from-[#29A9FF]/12 via-[#E5B65C]/8 to-transparent blur-3xl pointer-events-none animate-celestial-pulse" />

      {/* Main Headline */}
      <h1 className="relative z-10 text-5xl lg:text-6xl font-extrabold font-['IBM_Plex_Sans_Arabic'] text-[#DCE5EE] mb-4 tracking-tight leading-[1.2]">
        اكتشف{' '}
        <span className="text-[#E5B65C] drop-shadow-[0_0_24px_rgba(229,182,92,0.45)]">
          آفاقاً جديدة للتعلم
        </span>
      </h1>

      {/* Subtitle */}
      <p className="relative z-10 text-base sm:text-lg text-[#8299B5] font-['Tajawal'] max-w-2xl mx-auto mb-9 leading-relaxed">
        مرصدك الشخصي للعلم والمعرفة. استكشف آلاف الدورات والمنح الدراسية المصممة
        <br className="hidden sm:inline" />
        لتمكين مستقبلك التقني والأكاديمي.
      </p>

      {/* Desktop Smart Search Box */}
      <div className="relative z-10 w-full flex-center">
        <SmartSearchBox variant="desktop" onSearch={onSearch} />
      </div>
    </section>
  );
};
