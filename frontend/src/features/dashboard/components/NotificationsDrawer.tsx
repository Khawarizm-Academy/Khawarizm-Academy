import React, { useState } from 'react';
import { Radio, Award, BookOpen, Trophy, Bell, X } from 'lucide-react';
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
            <Radio size={18} strokeWidth={2} className="text-[#FF4D4D]" />
          </div>
        );
      case 'scholarship':
      case 'application':
        return (
          <div className="size-10 rounded-full bg-[#040F24] border border-[#E5B65C]/40 flex items-center justify-center shrink-0">
            <Award size={18} strokeWidth={2} className="text-[#E5B65C]" />
          </div>
        );
      case 'exam':
      case 'lesson':
        return (
          <div className="size-10 rounded-full bg-[#040F24] border border-[#29A9FF]/40 flex items-center justify-center shrink-0">
            <BookOpen size={18} strokeWidth={2} className="text-[#29A9FF]" />
          </div>
        );
      case 'competition':
        return (
          <div className="size-10 rounded-full bg-[#040F24] border border-[#10B981]/40 flex items-center justify-center shrink-0">
            <Trophy size={18} strokeWidth={2} className="text-[#10B981]" />
          </div>
        );
      default:
        return (
          <div className="size-10 rounded-full bg-[#040F24] border border-[#167BDB]/40 flex items-center justify-center shrink-0 text-[#29A9FF]">
            <Bell size={18} strokeWidth={2} />
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
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#1B3F80]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-[#167BDB]/30 to-[#29A9FF]/20 border border-[#29A9FF]/40 flex items-center justify-center text-[#29A9FF]">
              <Bell size={18} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-['Cairo',sans-serif] text-[#F1F5F9]">
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
              className="p-2 rounded-xl text-[#8299B5] hover:text-[#DCE5EE] hover:bg-[#092557] transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Scrollable Notification List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
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
