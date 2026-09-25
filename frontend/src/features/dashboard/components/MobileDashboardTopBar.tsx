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
  <div className="flex md:hidden justify-between items-center w-full py-1 select-none">
    <div className="flex items-center gap-2.5 text-right">{title}</div>

    <button
      type="button"
      onClick={onNotificationsClick}
      title="الإشعارات"
      className="btn-icon-circle relative"
    >
      <Bell size={18} strokeWidth={2} />
      {unreadCount > 0 && (
        <div className="px-1.5 py-0.5 -top-1 -right-1 absolute bg-red-500 rounded-full inline-flex justify-center items-center shadow-sm">
          <span className="text-white text-[10px] font-bold leading-none">{unreadCount}</span>
        </div>
      )}
    </button>
  </div>
);