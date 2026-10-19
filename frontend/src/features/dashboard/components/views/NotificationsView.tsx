import React from 'react';
import { Bell, ChevronLeft } from 'lucide-react';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { fetchDashboardNotifications, markNotificationRead } from '@/features/dashboard/data/dashboardFetchers';
import { NotificationListItem } from '@/features/dashboard/components/cards/NotificationListItem';
import { DashboardSectionEmpty } from '@/features/dashboard/components/states/DashboardSectionEmpty';
import type { NotificationItemData } from '@/features/dashboard/types';
export type { NotificationItemData };

interface NotificationsViewProps {
  onBack?: () => void;
  onSelectNotification?: (item: NotificationItemData) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onBack,
  onSelectNotification,
}) => {
  const { data, isLoading, setData } = useCachedData<NotificationItemData[]>(
    ['dashboard', 'notifications-view'],
    fetchDashboardNotifications,
    { initialData: [] }
  );

  const notifications = data;

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const handleMarkAllRead = () => {
    const unread = notifications.filter((n) => n.isUnread);
    // Writing the shared cache keeps the sidebar bell count in step with the list.
    setData(notifications.map((n) => ({ ...n, isUnread: false })));
    // Persist the whole batch; one failed call never blocks the others.
    void Promise.all(unread.map((n) => markNotificationRead(n.id))).catch(() => undefined);
  };

  const handleToggleRead = (id: string, item: NotificationItemData) => {
    setData(notifications.map((n) => (n.id === id ? { ...n, isUnread: false } : n)));
    // Persist the single read so the bell count stays right across sessions.
    void markNotificationRead(id).catch(() => undefined);
    onSelectNotification?.(item);
  };

  return (
    <div dir="rtl" className="w-full flex flex-col gap-6 select-none">
      {/* Mobile top bar: title + mark-read + back */}
      <div className="dash-mtop">
        <h2 className="text-white text-xl font-bold font-display text-right">الإشعارات</h2>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-blue-400 font-bold px-2.5 py-1 rounded-lg bg-blue-400/10 cursor-pointer"
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

      {/* Desktop section header: mark-read on the left, title on the right */}
      <div className="dash-notif-head">
        <div className="self-stretch">
          <button type="button" onClick={handleMarkAllRead} className="btn-pill-subtle">
            تحديد الكل كمقروء
          </button>
        </div>

        <div className="flex flex-col justify-start items-start text-right gap-1">
          <div className="section-accent-title-blue">
            <h2 className="text-white text-2xl font-bold font-display">مركز الإشعارات</h2>
          </div>
          <span className="text-slate-400 text-sm font-normal">
            {unreadCount > 0
              ? `لديك ${unreadCount} تنبيهات جديدة غير مقروءة`
              : 'لا توجد تنبيهات جديدة غير مقروءة'}
          </span>
        </div>
      </div>

      {/* Notification list, or its empty state */}
      {isLoading ? (
        <DataSectionSkeleton variant="list" count={5} />
      ) : notifications.length === 0 ? (
        <DashboardSectionEmpty
          icon={<Bell size={28} className="text-blue-400" />}
          title="لا توجد إشعارات بعد"
          text="ستظهر هنا كل التحديثات والتنبيهات المتعلقة بدوراتك ومنحك."
        />
      ) : (
        <div className="dash-list">
          {notifications.map((item, idx) => (
            <NotificationListItem
              key={item.id}
              index={idx}
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
