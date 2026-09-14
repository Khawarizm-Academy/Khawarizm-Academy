import React from 'react';

interface EmptyDashboardStateProps {
  userName?: string;
  onExploreCourses?: () => void;
  onExploreScholarships?: () => void;
}

export const EmptyDashboardState: React.FC<EmptyDashboardStateProps> = ({
  userName = 'سارة',
  onExploreCourses,
  onExploreScholarships,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto py-12 px-6 sm:px-10 glass-panel rounded-3xl border border-[#167BDB]/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex flex-col items-center text-center gap-8 animate-page-enter">
      {/* 1. Celestial Astrolabe Reticle (Fixing the Figma mobile 'CircleX' error with a majestic cosmic compass) */}
      <div className="relative size-28 sm:size-36 flex items-center justify-center">
        {/* Outer Cyan Beacon Ring with Glow */}
        <div className="absolute inset-0 rounded-full border-2 border-[#29A9FF]/60 shadow-[0_0_30px_rgba(41,169,255,0.35)] bg-[#040F24]/80" />
        
        {/* Secondary Gold Thin Orbit Ring */}
        <div className="absolute inset-2 rounded-full border border-[#E5B65C]/40" />

        {/* Orbiting Celestial Atoms (SVG Paths from Figma Desktop) */}
        <div className="absolute inset-4 animate-[spin_24s_linear_infinite]">
          <svg viewBox="0 0 55 55" fill="none" className="w-full h-full">
            <path
              d="M30.15 27.23a2.91 2.91 0 1 1-5.83 0 2.91 2.91 0 0 1 5.83 0ZM51.15 51.15C57.1 45.23 51.21 29.68 38.03 16.44 24.78 3.26 9.24-2.63 3.32 3.32c-5.95 5.92-.06 21.46 13.12 34.7 13.24 13.18 28.78 19.07 34.7 13.13ZM38.03 38.03C51.21 24.78 57.1 9.24 51.15 3.32c-5.92-5.95-21.46-.06-34.7 13.12C3.26 29.68-2.63 45.23 3.32 51.15c5.92 5.95 21.46.06 34.7-13.12Z"
              stroke="#E5B65C"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity={0.85}
            />
          </svg>
        </div>

        {/* Center Crosshair Target Reticle */}
        <div className="relative z-10 size-10 flex items-center justify-center">
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <path
              d="M36.67 20A16.67 16.67 0 0 1 20 36.67M36.67 20A16.67 16.67 0 0 0 20 3.33M36.67 20H30M20 36.67A16.67 16.67 0 0 1 3.33 20M20 36.67V30M20 3.33A16.67 16.67 0 0 0 3.33 20M20 3.33V10M3.33 20H10"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* 2. Text Details */}
      <div className="flex flex-col gap-3 max-w-lg">
        <h2 className="text-2xl sm:text-3xl font-bold font-['Cairo',sans-serif] text-[#F1F5F9] leading-snug">
          مرحبًا بك يا {userName}، ابدأ رحلتك الأولى اليوم!
        </h2>
        <p className="text-sm sm:text-base text-[#8299B5] font-['Tajawal',sans-serif] leading-relaxed">
          لوحتك التعليمية لا زالت فارغة وبانتظار خطوتك الأولى للتحدي. استكشف المنصات التعليمية والمنح
          الدراسية الممولة، أو ابدأ مسارًا تدريبيًا يساهم في بناء مهاراتك التقنية والمهنية لمستقبل واعد.
        </p>
      </div>

      {/* 3. Dual Exploration CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
        <button
          onClick={onExploreCourses}
          className="btn-outline-blue w-full sm:w-auto px-7 py-3 text-sm font-bold font-['Cairo',sans-serif] shadow-[0_0_15px_rgba(41,169,255,0.2)] cursor-pointer active:scale-95"
        >
          استكشف الدورات المميزة
        </button>
        <button
          onClick={onExploreScholarships}
          className="btn-outline-gold w-full sm:w-auto px-7 py-3 text-sm font-bold font-['Cairo',sans-serif] shadow-[0_0_15px_rgba(229,182,92,0.2)] cursor-pointer active:scale-95"
        >
          استكشف المنح والفرص
        </button>
      </div>
    </div>
  );
};
