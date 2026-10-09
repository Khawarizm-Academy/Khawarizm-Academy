import React, { useRef, useState, useEffect } from 'react';
import { Bell, LayoutDashboard, Search, User } from 'lucide-react';
import { BrandLogo } from '../Artwork/BrandVisuals';
import { type NavTabKey, toArabicNav, toEnglishNav } from '../../lib/localization';
import { NAV_TABS } from '../../lib/navigation';

interface DesktopNavbarProps {
  activeTab?: NavTabKey | string;
  onSelectTab?: (tab: NavTabKey) => void;
  onNotificationsClick?: () => void;
  unreadCount?: number;
}

export const DesktopNavbar: React.FC<DesktopNavbarProps> = ({
  activeTab = 'home',
  onSelectTab,
  onNotificationsClick,
  unreadCount = 3,
}) => {
  const normalizedActiveTab = toEnglishNav(activeTab);

  const navLinks = NAV_TABS.filter((tab) => tab.desktop);

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
            const isActive = normalizedActiveTab === link.key;
            return (
              <button
                key={link.key}
                ref={(el) => {
                  tabRefs.current[link.key] = el;
                }}
                onClick={() => onSelectTab?.(link.key)}
                className={`relative py-5 px-1 transition-colors duration-300 cursor-pointer ${
                  isActive
                    ? 'text-[#E5B65C] font-bold drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]'
                    : 'text-[#8299B5] hover:text-slate-100'
                }`}
              >
                <span>{toArabicNav(link.key)}</span>
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
        <div className="flex items-center gap-3">
          {/* Fast lane into the learning dashboard */}
          <button
            onClick={() => onSelectTab?.('dashboard' as NavTabKey)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#061A3A]/80 hover:bg-[#092557] border border-[#1B3F80] hover:border-[#29A9FF]/50 text-slate-100 hover:text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer group"
          >
            <LayoutDashboard
              size={15}
              className="text-[#29A9FF] transition-transform duration-300 group-hover:-translate-y-0.5"
            />
            <span>لوحتي</span>
          </button>

          {/* Guest Login CTA */}
          <button
            onClick={() => onSelectTab?.('login' as NavTabKey)}
            className="btn-gold py-1.5 px-4 text-xs font-bold hidden sm:inline-flex cursor-pointer"
          >
            تسجيل الدخول
          </button>

          {/* Search Button */}
          <button
            aria-label="بحث في المنصة"
            className="btn-icon-box group"
          >
            <Search size={18} className="transition-transform duration-300 group-hover:rotate-12" />
          </button>

          {/* Notifications Bell with Unread Badge */}
          <button
            onClick={onNotificationsClick}
            aria-label="الإشعارات"
            className="btn-icon-box group relative cursor-pointer"
          >
            <Bell size={18} className="group-hover:animate-bell-ring" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex w-2 h-2">
                {/* Ping halo behind the solid unread dot */}
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#040F24]" />
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <button
            onClick={() => onSelectTab?.('profile')}
            aria-label="الملف الشخصي"
            className="btn-icon-circle"
          >
            <User size={20} />
          </button>
        </div>

      </div>
    </header>
  );
};
