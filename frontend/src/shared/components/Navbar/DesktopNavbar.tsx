import React, { useRef, useState, useEffect } from 'react';
import { BrandLogo } from '../Artwork/BrandVisuals';
import { type NavTabKey, toArabicNav, toEnglishNav } from '../../lib/localization';

interface DesktopNavbarProps {
  activeTab?: NavTabKey | string;
  onSelectTab?: (tab: NavTabKey) => void;
}

export const DesktopNavbar: React.FC<DesktopNavbarProps> = ({
  activeTab = 'home',
  onSelectTab,
}) => {
  const normalizedActiveTab = toEnglishNav(activeTab);

  const navLinks: { id: NavTabKey; label: string }[] = [
    { id: 'home', label: toArabicNav('home') },
    { id: 'courses', label: toArabicNav('courses') },
    { id: 'scholarships', label: toArabicNav('scholarships') },
    { id: 'events', label: toArabicNav('events') },
    { id: 'competitions', label: toArabicNav('competitions') },
  ];

  const navRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const updateIndicator = () => {
    const currentTabEl = tabRefs.current[normalizedActiveTab] || tabRefs.current['home'];
    const navEl = navRef.current;
    if (currentTabEl && navEl) {
      const navRect = navEl.getBoundingClientRect();
      const tabRect = currentTabEl.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - navRect.left,
        width: tabRect.width,
        opacity: 1,
      });
    }
  };

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedActiveTab]);

  return (
    <header className="glass-navbar">
      <div className="max-w-[1280px] h-full mx-auto px-6 sm:px-10 flex-between">
        
        {/* Right (Start in RTL): Brand Logo */}
        <div className="flex items-center">
          <BrandLogo size={42} textClass="text-xl font-bold text-[#E5B65C]" onClick={() => onSelectTab?.('home')} />
        </div>

        {/* Center: Navigation Links with Physical Sliding Golden Beam Indicator */}
        <nav ref={navRef} className="relative flex items-center gap-8 text-sm font-['Tajawal'] font-medium h-full">
          {navLinks.map((link) => {
            const isActive = normalizedActiveTab === link.id;
            return (
              <button
                key={link.id}
                ref={(el) => {
                  tabRefs.current[link.id] = el;
                }}
                onClick={() => onSelectTab?.(link.id)}
                className={`relative py-5 px-1 transition-colors duration-300 cursor-pointer ${
                  isActive
                    ? 'text-[#E5B65C] font-bold drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]'
                    : 'text-[#8299B5] hover:text-[#DCE5EE]'
                }`}
              >
                <span>{link.label}</span>
              </button>
            );
          })}

          {/* Smooth Sliding Underline Indicator */}
          <div
            className="absolute bottom-0 h-[2.5px] bg-[#E5B65C] rounded-full pointer-events-none transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
              boxShadow: '0 0 10px #E5B65C, 0 0 20px rgba(229, 182, 92, 0.6)',
            }}
          />
        </nav>

        {/* Left (End in RTL): Actions & Profile */}
        <div className="flex items-center gap-3.5">
          {/* Search Button */}
          <button
            aria-label="بحث في المنصة"
            className="btn-icon-box"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14a9 3 0 0 0 18 0V5" />
              <path d="M3 12a9 3 0 0 0 18 0" />
            </svg>
          </button>

          {/* Notifications Bell with Unread Badge */}
          <button
            aria-label="الإشعارات"
            className="btn-icon-box relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D9534F] ring-2 ring-[#040F24]" />
          </button>

          {/* User Profile Avatar */}
          <button
            aria-label="الملف الشخصي"
            className="btn-icon-circle"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>

      </div>
    </header>
  );
};
