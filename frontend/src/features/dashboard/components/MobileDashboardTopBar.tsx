import React from 'react';
import { Bell } from 'lucide-react';

interface MobileDashboardTopBarProps {
  title: React.ReactNode;
  onNotificationsClick: () => void;
  unreadCount?: number;
}

export const MobileDashboardTopBar: React.FC<MobileDashboardTopBarProps> = ({
  title,
  onNotificationsClick,
  unreadCount = 0,
}) => (
  <div className="dash-mtop select-none">
    <div className="dash-mtop-title">{title}</div>

    <button
      type="button"
      onClick={onNotificationsClick}
      title="الإشعارات"
      className="btn-icon-circle relative"
    >
      <Bell size={18} strokeWidth={2} />
      {unreadCount > 0 && (
        <div className="dash-bell-badge -top-1 -right-1">
          <span className="dash-bell-count">{unreadCount}</span>
        </div>
      )}
    </button>
  </div>
);
