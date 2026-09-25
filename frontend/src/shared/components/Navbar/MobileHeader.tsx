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
      <div className="flex items-center gap-2.5">
        <BrandLogo size={36} textClass="text-lg font-bold text-[#E5B65C]" onClick={onLogoClick} />
      </div>

      {/* Header Actions (Left in RTL): Notifications Bell & Login CTA */}
      <div className="flex items-center gap-2.5">
        {/* Notification Bell Button */}
        {onNotificationsClick && (
          <button
            onClick={onNotificationsClick}
            aria-label="الإشعارات"
            className="relative p-2 rounded-full bg-[#061A3A]/80 border border-[#167BDB]/40 text-[#8299B5] hover:text-slate-100 transition-colors cursor-pointer"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#040F24]">
                {unreadCount}
              </span>
            )}
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

