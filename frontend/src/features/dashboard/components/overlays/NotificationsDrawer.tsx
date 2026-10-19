import React from 'react';
import { Bell, X } from 'lucide-react';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { dataCacheManager } from '@/shared/lib/cacheManager';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { fetchDrawerNotifications, markNotificationRead } from '@/features/dashboard/data/dashboardFetchers';
import { NotificationListItem } from '@/features/dashboard/components/cards/NotificationListItem';
import type { DashboardNotification } from '@/features/dashboard/types';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { data, isLoading, setData } = useCachedData<DashboardNotification[]>(
    ['dashboard', 'notifications-drawer'],
    fetchDrawerNotifications,
    { enabled: isOpen, initialData: [] }
  );

  const notifications = data;

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    const unread = notifications.filter((n) => !n.isRead);
    setData(notifications.map((n) => ({ ...n, isRead: true })));
    // The sidebar bell reads the view key, so refresh it too.
    dataCacheManager.invalidate(['dashboard', 'notifications-view']);
    // Persist the whole batch; one failed call never blocks the others.
    void Promise.all(unread.map((n) => markNotificationRead(n.id))).catch(() => undefined);
  };

  const handleItemClick = (notif: DashboardNotification) => {
    setData(notifications.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
    // The sidebar bell reads the view key, so refresh it too.
    dataCacheManager.invalidate(['dashboard', 'notifications-view']);
    // Persist the single read so the bell count stays right across sessions.
    void markNotificationRead(notif.id).catch(() => undefined);
    if (notif.link && onNavigate) {
      onClose();
      onNavigate(notif.link);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center sm:justify-end p-4 sm:p-6 bg-navy-950/85 backdrop-blur-md animate-page-enter"
      role="dialog"
      aria-modal="true"
      aria-label="مركز الإشعارات"
    >
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Notifications drawer box */}
      <div className="dash-drawer">
        {/* Drawer header */}
        <div className="dash-drawer-head">
          <div className="flex items-center gap-3">
            <div className="dash-drawer-icon">
              <Bell size={18} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-white">مركز الإشعارات</h2>
              <p className="text-xs text-slate-400">
                {unreadCount > 0
                  ? `لديك ${unreadCount} تنبيهات غير مقروءة`
                  : 'جميع التنبيهات مقروءة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-gold-400 hover:text-gold-200 font-bold px-2 py-1 rounded-lg hover:bg-gold-400/10 transition-colors cursor-pointer"
              >
                تحديد الكل كمقروء
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-navy-800 transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Scrollable notification list */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {isLoading ? (
            <DataSectionSkeleton variant="list" count={5} />
          ) : (
            notifications.map((notif) => (
              <NotificationListItem
                key={notif.id}
                text={notif.title}
                timeAgo={notif.timeAgo}
                type={notif.type}
                unread={!notif.isRead}
                onClick={() => handleItemClick(notif)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
