import React, { useRef, useState, useEffect } from 'react';
import { type NavTabKey, toArabicNav, toEnglishNav } from '../../lib/localization';
import { NAV_TABS } from '../../lib/navigation';

interface MobileBottomBarProps {
  activeTab?: NavTabKey | string;
  onSelectTab?: (tab: NavTabKey) => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeTab = 'home',
  onSelectTab,
}) => {
  const normalizedActiveTab = toEnglishNav(activeTab);

  const tabs = NAV_TABS.filter((tab) => tab.mobile);

  const activeIndex = tabs.findIndex((tab) => tab.key === normalizedActiveTab);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex]);

  return (
    <nav
      aria-label="شريط التنقل السفلي"
      className="glass-mobile-bottom-bar"
    >
      {/* Container with px-4 sm:px-6 ensures tab items NEVER touch the screen edges */}
      <div
        ref={containerRef}
        className="max-w-md mx-auto px-4 sm:px-6 grid grid-cols-5 relative items-center justify-items-center"
      >
        {/* Physical Sliding Golden Chamber Indicator — Thick, Deep, Substantial 2px Border & Measured Centering */}
        <div
          className="sliding-chamber-indicator"
          style={{
            left: `${chamberStyle.left}px`,
            width: `${chamberStyle.width}px`,
            height: `${chamberStyle.height}px`,
            opacity: chamberStyle.opacity,
          }}
        />

        {tabs.map((tab, idx) => {
          const isActive = normalizedActiveTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              onClick={() => onSelectTab?.(tab.key)}
              className="relative z-10 w-full h-[52px] flex-col-center gap-1 cursor-pointer focus:outline-none select-none transition-transform active:scale-95"
            >
              <div
                className={`transition-all duration-300 ${
                  isActive
                    ? 'text-[#E5B65C] scale-110 drop-shadow-[0_0_8px_rgba(229,182,92,0.7)]'
                    : 'text-[#8299B5] hover:text-slate-100'
                }`}
              >
                <Icon size={20} />
              </div>
              <span
                className={`text-[11px] font-['Tajawal'] transition-all duration-300 leading-none ${
                  isActive
                    ? 'font-bold text-[#E5B65C] drop-shadow-[0_0_6px_rgba(229,182,92,0.6)]'
                    : 'text-[#8299B5] hover:text-slate-100'
                }`}
              >
                {toArabicNav(tab.key, true)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
