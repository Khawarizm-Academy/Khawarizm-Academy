import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useCachedData } from '../../../shared/hooks/useCachedData';
import { DataSectionSkeleton } from '../../../shared/components/Loading/DataSectionSkeleton';
import { fetchDashboardNotifications } from '../data/dashboardFetchers';
import { NotificationListItem } from './NotificationListItem';
import type { NotificationItemData } from '../types';
export type { NotificationItemData };

interface NotificationsViewProps {
  onBack?: () => void;
  onSelectNotification?: (item: NotificationItemData) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onBack,
  onSelectNotification,
}) => {
  const { data, isLoading } = useCachedData<NotificationItemData[]>(
    ['dashboard', 'notifications-view'],
    fetchDashboardNotifications,
    { initialData: [] }
  );

  // Local override so marking-as-read persists for the session
  const [localItems, setLocalItems] = useState<NotificationItemData[] | null>(null);
  const notifications = localItems ?? data;

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const handleMarkAllRead = () => {
    setLocalItems((prev) => (prev ?? notifications).map((n) => ({ ...n, isUnread: false })));
  };

  const handleToggleRead = (id: string, item: NotificationItemData) => {
    setLocalItems((prev) =>
      (prev ?? notifications).map((n) => (n.id === id ? { ...n, isUnread: false } : n))
    );
    onSelectNotification?.(item);
  };

  return (
    <div dir="rtl" className="w-full flex flex-col gap-6 select-none">
      {/* Mobile Top Navigation Bar matching media_1789837891270.png */}
      <div className="flex md:hidden justify-between items-center w-full py-1">
        {/* Right: Title */}
        <h2 className="text-slate-200 text-xl font-bold font-['IBM_Plex_Sans_Arabic'] text-right">
          الإشعارات
        </h2>

        {/* Left: Mark all read + Back Chevron button */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-sky-400 font-bold px-2.5 py-1 rounded-lg bg-sky-400/10 cursor-pointer"
            >
              تحديد الكل كمقروء
            </button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="العودة"
              className="btn-icon-circle"
            >
              <ChevronLeft size={20} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Section-Header matching media_1789837891286.png */}
      <div

        className="self-stretch hidden md:flex justify-between items-center"
      >
        {/* Left: Mark All as Read button */}
        <div className="self-stretch">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="btn-pill-subtle px-4 py-2 text-sm"
          >
            تحديد الكل كمقروء
          </button>
        </div>

        {/* Right: Title & Unread Count info */}
        <div className="flex flex-col justify-start items-start text-right gap-1">
          <h2 className="text-slate-200 text-2xl font-bold font-['IBM_Plex_Sans_Arabic']">
            مركز الإشعارات
          </h2>
          <span className="text-slate-400 text-sm font-normal font-['Tajawal']">
            {unreadCount > 0 ? `لديك ${unreadCount} تنبيهات جديدة غير مقروءة` : 'لا توجد تنبيهات جديدة غير مقروءة'}
          </span>
        </div>
      </div>

      {/* Notification-List matching Figma & Screenshots */}
      {isLoading ? (
        <DataSectionSkeleton variant="list" count={5} />
      ) : (
        <div className="self-stretch flex flex-col justify-start items-start gap-3">
        {notifications.map((item) => (
          <NotificationListItem
            key={item.id}
            text={item.message}
            timeAgo={item.timeAgo}
            type={item.type}
            unread={item.isUnread}
            onClick={() => handleToggleRead(item.id, item)}
          />
        ))}
      </div>
      )}
    </div>
  );
};
