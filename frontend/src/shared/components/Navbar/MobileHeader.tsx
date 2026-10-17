import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import { BrandLogo } from '@/shared/components/Artwork/BrandVisuals';

export interface MobileHeaderProps {
  onLogoClick?: () => void;
  onLoginClick?: () => void;
  onNotificationsClick?: () => void;
  unreadCount?: number;
  /** Signed-in account state, fed by the app layer so shared chrome stays dumb. */
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onLogoClick,
  onLoginClick,
  onNotificationsClick,
  unreadCount = 3,
  isAuthenticated = false,
  onLogout,
}) => {
  return (
    <header className="glass-mobile-header flex-between px-4">
      {/* Brand Title and Astrolabe Crest on the Right in RTL */}
      <div className="mh-group">
        <BrandLogo size={36} textClass="text-lg font-bold text-gold-400" onClick={onLogoClick} />
      </div>

      {/* Header Actions (Left in RTL): Notifications Bell & Login CTA */}
      <div className="mh-group">
        {/* Notification Bell Button */}
        {onNotificationsClick && (
          <button onClick={onNotificationsClick} aria-label="الإشعارات" className="mh-bell group">
            <Bell size={18} className="group-hover:animate-bell-ring" />
            {unreadCount > 0 && <span className="mh-badge">{unreadCount}</span>}
          </button>
        )}

        {/* Login CTA for guests, sign-out for signed-in readers */}
        {isAuthenticated ? (
          <button
            onClick={onLogout}
            aria-label="تسجيل الخروج"
            className="btn-icon-box group cursor-pointer"
          >
            <LogOut size={18} className="text-slate-200 group-hover:text-danger-500 transition-colors" />
          </button>
        ) : (
          onLoginClick && (
            <button
              onClick={onLoginClick}
              className="btn-gold py-1 px-3 text-xs font-bold cursor-pointer"
            >
              دخول
            </button>
          )
        )}
      </div>
    </header>
  );
};
