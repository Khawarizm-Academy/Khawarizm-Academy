import React, { useRef, useState, useEffect } from 'react';
import { type NavTabKey, toArabicNav, toEnglishNav } from '@/shared/lib/localization';
import { NAV_TABS } from '@/shared/lib/navigation';

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
    <nav aria-label="شريط التنقل السفلي" className="glass-mobile-bottom-bar">
      {/* Container with px-4 sm:px-6 ensures tab items NEVER touch the screen edges */}
      <div ref={containerRef} className="bb-row">
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
              className="bb-tab"
            >
              <div className={`bb-icon ${isActive ? 'bb-icon-on' : 'bb-icon-idle'}`}>
                <Icon size={20} />
              </div>
              <span className={`bb-label ${isActive ? 'bb-label-on' : 'bb-label-idle'}`}>
                {toArabicNav(tab.key, true)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
