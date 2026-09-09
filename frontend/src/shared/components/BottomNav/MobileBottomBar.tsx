import React, { useRef, useState, useEffect } from 'react';

interface MobileBottomBarProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeTab = 'لوحتي',
  onSelectTab,
}) => {
  const tabs = [
    {
      id: 'home',
      label: 'الرئيسية',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 'courses',
      label: 'الدورات',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      ),
    },
    {
      id: 'scholarships',
      label: 'المنح',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="6" />
          <path d="m15.477 12.89 2.523 7.11-6-3-6 3 2.523-7.11" />
        </svg>
      ),
    },
    {
      id: 'dashboard',
      label: 'لوحتي',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'حسابي',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  const activeIndex = tabs.findIndex((t) => t.label === activeTab);
  const safeIndex = activeIndex >= 0 ? activeIndex : 3;

  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [chamberStyle, setChamberStyle] = useState<{
    left: number;
    width: number;
    height: number;
    opacity: number;
  }>({
    left: 0,
    width: 66,
    height: 52,
    opacity: 0,
  });

  // Calculate pixel-perfect center alignment over the active tab button
  const updateChamberPosition = () => {
    const activeBtn = tabRefs.current[safeIndex];
    const container = containerRef.current;
    if (!activeBtn || !container) return;

    const btnRect = activeBtn.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    // Box dimensions: substantial and thick (66px wide x 52px high)
    const boxWidth = Math.min(68, Math.max(60, btnRect.width - 4));
    const boxHeight = 52;

    // Center the box exactly on the active button's center point
    const btnCenter = (btnRect.left - contRect.left) + (btnRect.width / 2);
    const left = btnCenter - (boxWidth / 2);

    setChamberStyle({
      left,
      width: boxWidth,
      height: boxHeight,
      opacity: 1,
    });
  };

  useEffect(() => {
    updateChamberPosition();
    const t1 = setTimeout(updateChamberPosition, 40);
    const t2 = setTimeout(updateChamberPosition, 150);
    window.addEventListener('resize', updateChamberPosition);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', updateChamberPosition);
    };
  }, [safeIndex]);

  return (
    <nav
      aria-label="شريط التنقل السفلي"
      className="fixed bottom-0 left-0 right-0 z-[100] w-full bg-[#061A3A]/95 backdrop-blur-xl border-t-2 border-[#1B3F80] shadow-[0_-8px_30px_rgba(0,0,0,0.7)] select-none pb-[max(env(safe-area-inset-bottom),10px)] pt-2"
    >
      {/* Container with px-4 sm:px-6 ensures tab items NEVER touch the screen edges */}
      <div
        ref={containerRef}
        className="max-w-md mx-auto px-4 sm:px-6 grid grid-cols-5 relative items-center justify-items-center"
      >
        {/* Physical Sliding Golden Chamber Indicator — Thick, Deep, Substantial 2px Border & Measured Centering */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-b from-[#092350] via-[#061A3A] to-[#040F24] border-2 border-[#E5B65C] shadow-[0_0_16px_rgba(229,182,92,0.65),inset_0_1px_3px_rgba(255,255,255,0.15)] pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            left: `${chamberStyle.left}px`,
            width: `${chamberStyle.width}px`,
            height: `${chamberStyle.height}px`,
            opacity: chamberStyle.opacity,
          }}
        />

        {tabs.map((tab, idx) => {
          const isActive = activeTab === tab.label;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              onClick={() => onSelectTab?.(tab.label)}
              className="relative z-10 w-full h-[52px] flex flex-col items-center justify-center gap-1 cursor-pointer focus:outline-none select-none transition-transform active:scale-95"
            >
              <div
                className={`transition-all duration-300 ${
                  isActive
                    ? 'text-[#E5B65C] scale-110 drop-shadow-[0_0_8px_rgba(229,182,92,0.7)]'
                    : 'text-[#8299B5] hover:text-[#DCE5EE]'
                }`}
              >
                {tab.icon}
              </div>
              <span
                className={`text-[11px] font-['Tajawal'] transition-all duration-300 leading-none ${
                  isActive
                    ? 'font-bold text-[#E5B65C] drop-shadow-[0_0_6px_rgba(229,182,92,0.6)]'
                    : 'text-[#8299B5] hover:text-[#DCE5EE]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
