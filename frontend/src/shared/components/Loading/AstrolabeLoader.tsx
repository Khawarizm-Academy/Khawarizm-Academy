import React from 'react';

interface AstrolabeLoaderProps {
  fullScreen?: boolean;
  message?: string;
}

export const AstrolabeLoader: React.FC<AstrolabeLoaderProps> = ({
  fullScreen = false,
  message = 'جاري رصد البيانات الفلكية...',
}) => {
  const content = (
    <div className="flex-col-center gap-6 select-none">
      {/* Animated Astrolabe Gyroscopic Device */}
      <div className="relative w-28 h-28 flex-center">
        {/* Ambient Pulsing Gold Glow */}
        <div className="absolute inset-0 rounded-full bg-[#E5B65C]/15 blur-2xl animate-celestial-pulse pointer-events-none" />

        {/* Outermost Ring — Brass Degree Marks rotating clockwise */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#E5B65C]/60 animate-orbit-slow" />

        {/* Middle Ring — Tech Cyan Celestial Ring rotating counter-clockwise */}
        <div className="absolute inset-2 rounded-full border border-[#29A9FF]/70 animate-counter-orbit-slow">
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#29A9FF] shadow-[0_0_8px_#29A9FF]" />
        </div>

        {/* Inner Astrolabe Ecliptic Ellipse */}
        <div className="absolute inset-5 rounded-full border border-[#E5B65C]/80 transform rotate-45 animate-pulse" />

        {/* Central Luminous Core Star */}
        <div className="relative z-10 w-7 h-7 rounded-full bg-gradient-to-tr from-[#C88A32] to-[#E5B65C] shadow-[0_0_20px_#E5B65C] flex-center">
          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#FFFFFF]" />
        </div>
      </div>

      {/* Brand & Loading Label */}
      <div className="flex-col-center gap-1.5 text-center">
        <span className="text-sm font-bold text-[#E5B65C] font-['IBM_Plex_Sans_Arabic'] tracking-tight">
          أكاديمية خوارزم
        </span>
        <span className="text-xs text-[#8299B5] font-['Tajawal'] tracking-wide animate-pulse">
          {message}
        </span>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#040F24]/95 backdrop-blur-md flex-center">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full py-12 flex-center">
      {content}
    </div>
  );
};
