import React from 'react';
import { Bell, Bookmark } from 'lucide-react';

interface MobileDashboardTopBarProps {
  title: React.ReactNode;
  onNotificationsClick: () => void;
  onSavedClick?: () => void;
  isSavedActive?: boolean;
  unreadCount?: number;
}

export const MobileDashboardTopBar: React.FC<MobileDashboardTopBarProps> = ({
  title,
  onNotificationsClick,
  onSavedClick,
  isSavedActive = false,
  unreadCount = 0,
}) => (
  <div className="dash-mtop select-none">
    <div className="dash-mtop-title">{title}</div>

    {/* Saved (bookmark) + notifications (bell) side by side */}
    <div className="flex items-center gap-2">
      {onSavedClick && (
        <button
          type="button"
          onClick={onSavedClick}
          title="المحفوظات"
          className={`dash-bell relative ${isSavedActive ? 'dash-bell-active' : 'dash-bell-idle'}`}
        >
          <Bookmark size={18} strokeWidth={2} />
        </button>
      )}

      <button
        type="button"
        onClick={onNotificationsClick}
        title="الإشعارات"
        className="dash-bell dash-bell-idle relative"
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <div className="dash-bell-badge -top-1 -right-1">
            <span className="dash-bell-count">{unreadCount}</span>
          </div>
        )}
      </button>
    </div>
  </div>
);
