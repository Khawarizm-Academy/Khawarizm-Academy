import React, { useState } from 'react';
import type { DashboardNotification } from '../types';
import { mockNotifications } from '../data/mockDashboardData';

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
  const [notifications, setNotifications] = useState<DashboardNotification[]>(mockNotifications);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleItemClick = (notif: DashboardNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    if (notif.link && onNavigate) {
      onClose();
      onNavigate(notif.link);
    }
  };

  const getNotificationIcon = (type: DashboardNotification['type']) => {
    switch (type) {
      case 'live':
        return (
          <div className="size-10 rounded-full bg-[#040F24] border border-[#FF4D4D]/40 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4D4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
        );
      case 'scholarship':
      case 'application':
        return (
          <div className="size-10 rounded-full bg-[#040F24] border border-[#E5B65C]/40 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E5B65C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6" />
              <path d="m15.477 12.89 2.523 7.11-6-3-6 3 2.523-7.11" />
            </svg>
          </div>
        );
      case 'exam':
      case 'lesson':
        return (
          <div className="size-10 rounded-full bg-[#040F24] border border-[#29A9FF]/40 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#29A9FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
          </div>
        );
      case 'competition':
        return (
          <div className="size-10 rounded-full bg-[#040F24] border border-[#10B981]/40 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="size-10 rounded-full bg-[#040F24] border border-[#167BDB]/40 flex items-center justify-center shrink-0 text-[#29A9FF]">
            🔔
          </div>
        );
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
        {/* Header Row */}
        <div className="flex items-center justify-between p-5 border-b border-[#1B3F80]/40 bg-[#040F24]/70">
          <div className="flex flex-col gap-0.5 text-right">
            <h2 className="text-lg font-bold font-['Cairo',sans-serif] text-[#F1F5F9]">
              مركز الإشعارات
            </h2>
            <span className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
              {unreadCount > 0
                ? `لديك ${unreadCount} تنبيهات جديدة غير مقروءة`
                : 'لا توجد تنبيهات جديدة'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-[#29A9FF] hover:text-[#E5B65C] font-['Tajawal'] px-2 py-1 transition-colors cursor-pointer"
              >
                تحديد الكل كمقروء
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-[#8299B5] hover:text-[#DCE5EE] transition-colors cursor-pointer"
              aria-label="إغلاق النافذة"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Notification List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-none">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleItemClick(notif)}
              className={`relative flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                notif.isRead
                  ? 'bg-[#040F24]/60 border-[#1B3F80]/30 hover:border-[#167BDB]/50'
                  : 'bg-[#092557]/40 border-[#29A9FF]/40 shadow-[0_4px_16px_rgba(41,169,255,0.12)]'
              }`}
            >
              {/* Unread Glowing Dot */}
              {!notif.isRead && (
                <span className="absolute top-4 left-3 size-2 rounded-full bg-[#29A9FF] shadow-[0_0_8px_#29A9FF]" />
              )}

              {/* Categorized Icon */}
              {getNotificationIcon(notif.type)}

              {/* Notification Text Content */}
              <div className="flex-1 flex flex-col gap-1 text-right">
                <p
                  className={`text-xs sm:text-sm font-['Tajawal',sans-serif] leading-relaxed ${
                    notif.isRead ? 'text-[#8299B5]' : 'text-[#F1F5F9] font-medium'
                  }`}
                >
                  {notif.title}
                </p>
                <span className="text-[11px] text-[#5A7394] font-['Tajawal']">
                  {notif.timeAgo}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
