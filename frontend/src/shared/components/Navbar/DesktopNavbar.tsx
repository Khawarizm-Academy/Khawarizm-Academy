import React, { useRef, useState, useEffect } from 'react';
import { Bell, LayoutDashboard, LogOut, Search, Shield, User } from 'lucide-react';
import { BrandLogo } from '@/shared/components/Artwork/BrandVisuals';
import { type NavTabKey, toArabicNav, toEnglishNav } from '@/shared/lib/localization';
import { NAV_TABS } from '@/shared/lib/navigation';

interface DesktopNavbarProps {
  activeTab?: NavTabKey | string;
  onSelectTab?: (tab: NavTabKey) => void;
  onNotificationsClick?: () => void;
  unreadCount?: number;
  /** Signed-in account state, fed by the app layer so shared chrome stays dumb. */
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  onLoginClick?: () => void;
  onAdminClick?: () => void;
  onLogout?: () => void;
}

export const DesktopNavbar: React.FC<DesktopNavbarProps> = ({
  activeTab = 'home',
  onSelectTab,
  onNotificationsClick,
  unreadCount = 3,
  isAuthenticated = false,
  isAdmin = false,
  onLoginClick,
  onAdminClick,
  onLogout,
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
      <div className="nav-shell flex-between">
        {/* Right (Start in RTL): Brand Logo */}
        <div className="flex items-center">
          <BrandLogo size={42} textClass="text-xl font-bold text-gold-400" onClick={() => onSelectTab?.('home')} />
        </div>

        {/* Center: Navigation Links with Physical Sliding Golden Beam Indicator */}
        <nav ref={navRef} className="nav-center">
          {navLinks.map((link) => {
            const isActive = normalizedActiveTab === link.key;
            return (
              <button
                key={link.key}
                ref={(el) => {
                  tabRefs.current[link.key] = el;
                }}
                onClick={() => onSelectTab?.(link.key)}
                className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-idle'}`}
              >
                <span>{toArabicNav(link.key)}</span>
              </button>
            );
          })}

          {/* Smooth Sliding Underline Indicator */}
          <div
            className="nav-indicator"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
              boxShadow: '0 0 10px var(--color-gold-400), 0 0 20px rgba(229, 182, 92, 0.6)',
            }}
          />
        </nav>

        {/* Left (End in RTL): Actions & Profile */}
        <div className="nav-actions">
          {/* Fast lane into the learning dashboard */}
          <button
            onClick={() => onSelectTab?.('dashboard' as NavTabKey)}
            className="nav-dash-chip group"
          >
            <LayoutDashboard
              size={15}
              className="text-blue-400 transition-transform duration-300 group-hover:-translate-y-0.5"
            />
            <span>لوحتي</span>
          </button>

          {/* Guest login CTA, or the signed-in control cluster */}
          {!isAuthenticated && (
            <button
              onClick={onLoginClick}
              className="btn-gold py-1.5 px-4 text-xs font-bold hidden sm:inline-flex cursor-pointer"
            >
              تسجيل الدخول
            </button>
          )}

          {/* Search Button */}
          <button aria-label="بحث في المنصة" className="btn-icon-box group">
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
              <span className="nav-bell-dot">
                {/* Ping halo behind the solid unread dot */}
                <span className="nav-bell-ping" />
                <span className="nav-bell-core" />
              </span>
            )}
          </button>

          {/* Admin console entry, admins only */}
          {isAuthenticated && isAdmin && (
            <button
              onClick={onAdminClick}
              aria-label="لوحة الإدارة"
              title="لوحة الإدارة"
              className="btn-icon-box group cursor-pointer"
            >
              <Shield size={18} className="text-gold-400 group-hover:animate-pulse" />
            </button>
          )}

          {/* User Profile Avatar */}
          <button
            onClick={() => onSelectTab?.('profile')}
            aria-label="الملف الشخصي"
            className="btn-icon-circle"
          >
            <User size={20} />
          </button>

          {/* Sign out, signed-in readers only */}
          {isAuthenticated && (
            <button
              onClick={onLogout}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              className="btn-icon-box group cursor-pointer"
            >
              <LogOut size={18} className="text-slate-300 group-hover:text-danger-500 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
