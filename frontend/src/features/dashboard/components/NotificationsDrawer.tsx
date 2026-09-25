import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useCachedData } from '../../../shared/hooks/useCachedData';
import { DataSectionSkeleton } from '../../../shared/components/Loading/DataSectionSkeleton';
import { fetchDrawerNotifications } from '../data/dashboardFetchers';
import { NotificationListItem } from './NotificationListItem';
import type { DashboardNotification } from '../types';

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
  const { data, isLoading } = useCachedData<DashboardNotification[]>(
    ['dashboard', 'notifications-drawer'],
    fetchDrawerNotifications,
    { enabled: isOpen, initialData: [] }
  );

  // Local override so marking-as-read persists for the session
  const [localItems, setLocalItems] = useState<DashboardNotification[] | null>(null);
  const notifications = localItems ?? data;

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    setLocalItems((prev) => (prev ?? notifications).map((n) => ({ ...n, isRead: true })));
  };

  const handleItemClick = (notif: DashboardNotification) => {
    setLocalItems((prev) =>
      (prev ?? notifications).map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    if (notif.link && onNavigate) {
      onClose();
      onNavigate(notif.link);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center sm:justify-end p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-page-enter"
      role="dialog"
      aria-modal="true"
      aria-label="مركز الإشعارات"
    >
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Notifications Modal Box */}
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col bg-[#061A3A]/95 border border-[#167BDB]/50 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#1B3F80]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-[#167BDB]/30 to-[#29A9FF]/20 border border-[#29A9FF]/40 flex items-center justify-center text-[#29A9FF]">
              <Bell size={18} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-['IBM_Plex_Sans_Arabic'] text-white">
                مركز الإشعارات
              </h2>
              <p className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
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
                className="text-xs text-[#E5B65C] hover:text-[#FFD179] font-['Tajawal'] font-bold px-2 py-1 rounded-lg hover:bg-[#E5B65C]/10 transition-colors cursor-pointer"
              >
                تحديد الكل كمقروء
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#8299B5] hover:text-slate-100 hover:bg-[#092557] transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

{/* Scrollable Notification List */}
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
