import React from 'react';
import { Bell } from 'lucide-react';
import { BrandLogo } from '../Artwork/BrandVisuals';

export interface MobileHeaderProps {
  onLogoClick?: () => void;
  onLoginClick?: () => void;
  onNotificationsClick?: () => void;
  unreadCount?: number;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onLogoClick,
  onLoginClick,
  onNotificationsClick,
  unreadCount = 3,
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

        {/* Login CTA */}
        {onLoginClick && (
          <button
            onClick={onLoginClick}
            className="btn-gold py-1 px-3 text-xs font-bold cursor-pointer"
          >
            دخول
          </button>
        )}
      </div>
    </header>
  );
};
