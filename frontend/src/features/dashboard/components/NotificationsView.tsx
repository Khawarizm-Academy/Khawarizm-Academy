import React, { useState } from 'react';

interface NotificationItemData {
  id: string;
  message: string;
  timeAgo: string;
  isUnread: boolean;
  type: 'live' | 'scholarship' | 'exam' | 'competition' | 'lesson';
}

const initialNotifications: NotificationItemData[] = [
  {
    id: 'notif-1',
    message: 'جلستك المباشرة في برمجة بايثون تبدأ خلال 30 دقيقة. استعد وانضم الآن للتفاعل المباشر.',
    timeAgo: 'منذ 5 دقائق',
    isUnread: true,
    type: 'live',
  },
  {
    id: 'notif-2',
    message: 'منحة جديدة تطابق اهتماماتك وتخصصك: برنامج الابتعاث الخارجي المتميز لمرحلة البكالوريوس والماجستير.',
    timeAgo: 'منذ ساعتين',
    isUnread: true,
    type: 'scholarship',
  },
  {
    id: 'notif-3',
    message: 'تم تصحيح اختبارك في أساسيات البرمجة بنجاح - حصلت على درجة مميزة 87%. مبارك نجاحك!',
    timeAgo: 'أمس',
    isUnread: true,
    type: 'exam',
  },
  {
    id: 'notif-4',
    message: 'مسابقة تحدي الخوارزميات تبدأ غدًا. تأكد من مراجعة القواعد والتحضير.',
    timeAgo: 'منذ يومين',
    isUnread: false,
    type: 'competition',
  },
  {
    id: 'notif-5',
    message: 'تمت إضافة درس جديد في تصميم واجهات المستخدم (أدوات النماذج التفاعلية).',
    timeAgo: 'منذ 3 أيام',
    isUnread: false,
    type: 'lesson',
  },
  {
    id: 'notif-6',
    message: 'تحديث حالة طلب المنحة: تم قبول طلبك المبدئي في منحة التميز العلمي.',
    timeAgo: 'منذ أسبوع',
    isUnread: false,
    type: 'scholarship',
  },
];

interface NotificationsViewProps {
  onBack?: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onBack }) => {
  const [notifications, setNotifications] = useState<NotificationItemData[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: !n.isUnread } : n))
    );
  };

  return (
    <div dir="rtl" className="w-full flex flex-col gap-6">
      {/* Mobile Top Navigation Bar matching lines 3-22 of Notifications - Dashboard - Mobile.html */}
      <div className="flex md:hidden justify-between items-center w-full py-1">
        <h2 className="text-slate-200 text-lg font-bold font-['Cairo'] text-right">
          الإشعارات ({unreadCount})
        </h2>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-sky-400 font-bold px-2.5 py-1 rounded bg-sky-400/10"
            >
              تحديد الكل كمقروء
            </button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="العودة"
              className="size-9 bg-slate-900 rounded-full outline outline-1 outline-blue-900 flex justify-center items-center text-slate-300"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.75 13.5L11.25 9L6.75 4.5" stroke="#8299B5" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Section-Header matching lines 38-54 of Notifications - Dashboard - Desktop.html */}
      <div
        data-layer="Section-Header"
        className="SectionHeader self-stretch hidden md:flex justify-between items-center"
      >
        <div data-layer="Action Left" className="ActionLeft">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 rounded-lg outline outline-1 outline-offset-[-1px] outline-blue-900 hover:outline-sky-400 text-slate-400 hover:text-slate-200 text-sm font-medium font-['Tajawal'] transition-all cursor-pointer"
          >
            تحديد الكل كمقروء
          </button>
        </div>

        <div data-layer="Header Title Info" className="HeaderTitleInfo flex flex-col justify-start items-start text-right gap-1">
          <h2 data-layer="مركز الإشعارات" className="text-slate-200 text-2xl font-bold font-['Cairo']">
            مركز الإشعارات
          </h2>
          <span data-layer="لديك تنبيهات جديدة" className="text-slate-400 text-sm font-normal font-['Tajawal']">
            {unreadCount > 0 ? `لديك ${unreadCount} تنبيهات جديدة غير مقروءة` : 'لا توجد تنبيهات جديدة غير مقروءة'}
          </span>
        </div>
      </div>

      {/* Notification-List matching lines 55-180 of Desktop & 25-180 of Mobile */}
      <div data-layer="Notification-List" className="NotificationList self-stretch flex flex-col justify-start items-start gap-3">
        {notifications.map((item) => (
          <div
            key={item.id}
            data-layer="Notification Item"
            onClick={() => handleToggleRead(item.id)}
            className={`NotificationItem self-stretch p-3.5 md:p-4 rounded-2xl outline outline-1 outline-offset-[-1px] flex justify-between items-center gap-3 md:gap-5 transition-all cursor-pointer ${
              item.isUnread
                ? 'bg-slate-900 outline-sky-400/40 shadow-[0_4px_20px_rgba(41,169,255,0.06)]'
                : 'bg-blue-950/60 outline-blue-900/60 opacity-85'
            }`}
          >
            {/* Right side in RTL: Icon Container + Message text */}
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 text-right">
              {/* Category Icon matching Figma */}
              <div
                data-layer="Icon Container"
                className="IconContainer size-10 md:size-12 bg-slate-900 rounded-full flex justify-center items-center shrink-0 border border-blue-900/60"
              >
                {item.type === 'live' && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M10 1C11.5 1 13 1.5 14 2.5C15.1 3.5 15.7 4.7 15.7 6C15.7 8.4 16.1 10 16.7 11.3C17.4 12.5 18.2 13.3 19 14H1C1.8 13.3 2.6 12.5 3.3 11.3C3.9 10 4.3 8.4 4.3 6C4.3 4.7 4.9 3.5 6 2.5C7 1.5 8.5 1 10 1Z"
                      stroke="#FF4D4D"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {item.type === 'scholarship' && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M10 1C12.6 1 14.9 1.6 16.6 2.6C18.2 3.6 19 4.8 19 6C19 7.4 17.8 8.9 15.4 10L14.8 11.2L17.1 18.9L11.2 16.2C10.8 16 10.4 16 10 16C9.5 16 9 16.1 8.6 16.3L2.9 18.9L5.2 11.2L4.6 10C2.2 8.9 1 7.4 1 6C1 4.8 1.8 3.6 3.4 2.6C5.1 1.6 7.4 1 10 1Z"
                      stroke="#E5B65C"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {item.type === 'exam' && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M9 5V15M9 5C9 4.2 8.7 3.5 8.1 3C7.5 2.5 6.8 2.2 6 2.2H2.2C1.8 2.2 1.5 2.6 1.5 3V12.8C1.5 13.2 1.8 13.5 2.2 13.5H6.8C7.4 13.5 8 13.7 8.3 14.2C8.7 14.6 9 15.2 9 15.8M9 5C9 4.2 9.3 3.5 9.9 3C10.5 2.5 11.2 2.2 12 2.2H15.8C16.2 2.2 16.5 2.6 16.5 3V12.8C16.5 13.2 16.2 13.5 15.8 13.5H11.2C10.7 13.5 10.1 13.7 9.7 14.2C9.2 14.6 9 15.2 9 15.8"
                      stroke="#29A9FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {item.type === 'competition' && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M13.5 6.75H14.6C15.1 6.75 15.6 6.55 16 6.2C16.3 5.85 16.5 5.37 16.5 4.87C16.5 4.38 16.3 3.9 16 3.55C15.6 3.2 15.1 3 14.6 3H13.5M13.5 6.75C13.5 7.94 13 9.09 12.2 9.93C11.3 10.78 10.2 11.25 9 11.25C7.8 11.25 6.7 10.78 5.8 9.93C5 9.09 4.5 7.94 4.5 6.75M13.5 6.75V2.25H5.25V6.75M4.5 6.75H3.4C2.9 6.75 2.4 6.55 2 6.2C1.7 5.85 1.5 5.37 1.5 4.87C1.5 4.38 1.7 3.9 2 3.55C2.4 3.2 2.9 3 3.4 3H4.5M3 16.5H15"
                      stroke="#10B981"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {item.type === 'lesson' && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M9 5V15M9 5C9 4.2 8.7 3.5 8.1 3C7.5 2.5 6.8 2.2 6 2.2H2.2C1.8 2.2 1.5 2.6 1.5 3V12.8C1.5 13.2 1.8 13.5 2.2 13.5H6.8C7.4 13.5 8 13.7 8.3 14.2C8.7 14.6 9 15.2 9 15.8"
                      stroke="#29A9FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>

              {/* Text Info */}
              <div data-layer="Details Left" className="DetailsLeft flex-1 flex flex-col justify-start items-start gap-1">
                <p
                  data-layer={item.message}
                  className="text-right text-slate-200 text-xs md:text-sm font-normal font-['Tajawal'] leading-5"
                >
                  {item.message}
                </p>
                <span
                  data-layer={item.timeAgo}
                  className="text-right text-slate-400 text-[11px] md:text-xs font-normal font-['Tajawal']"
                >
                  {item.timeAgo}
                </span>
              </div>
            </div>

            {/* Left side in RTL: Unread Indicator Dot */}
            <div data-layer="Indicator Section" className="shrink-0 flex items-center justify-center size-4">
              {item.isUnread && (
                <div className="size-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(41,169,255,0.8)]" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
