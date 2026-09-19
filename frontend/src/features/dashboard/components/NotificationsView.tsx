import React, { useState } from 'react';
import { Bell, Award, BookOpen, Trophy, ChevronLeft } from 'lucide-react';

export interface NotificationItemData {
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
    message: 'تحدي الخوارزميات الشتوي يبدأ غدًا في الصباح الباكر. تأكد من مراجعة القواعد والتحضير بشكل مناسب.',
    timeAgo: 'منذ يومين',
    isUnread: false,
    type: 'competition',
  },
  {
    id: 'notif-5',
    message: 'تمت إضافة درس جديد في تصميم واجهات المستخدم (أدوات النماذج التفاعلية المتقدمة وتجربة المستخدم).',
    timeAgo: 'منذ 3 أيام',
    isUnread: false,
    type: 'lesson',
  },
  {
    id: 'notif-6',
    message: 'تحديث حالة طلب المنحة: تم قبول طلبك المبدئي في منحة التميز العلمي والابتكار التقني.',
    timeAgo: 'منذ أسبوع',
    isUnread: false,
    type: 'scholarship',
  },
];

interface NotificationsViewProps {
  onBack?: () => void;
  onSelectNotification?: (item: NotificationItemData) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onBack,
  onSelectNotification,
}) => {
  const [notifications, setNotifications] = useState<NotificationItemData[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const handleToggleRead = (id: string, item: NotificationItemData) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n))
    );
    onSelectNotification?.(item);
  };

  return (
    <div dir="rtl" className="w-full flex flex-col gap-6 select-none">
      {/* Mobile Top Navigation Bar matching media_1789837891270.png */}
      <div className="flex md:hidden justify-between items-center w-full py-1">
        {/* Right: Title */}
        <h2 className="text-slate-200 text-xl font-bold font-['Cairo'] text-right">
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
              className="size-9 bg-slate-900 rounded-full outline outline-1 outline-blue-900 hover:outline-sky-400 flex justify-center items-center text-[#8299B5] hover:text-slate-200 cursor-pointer transition-all"
            >
              <ChevronLeft size={20} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Section-Header matching media_1789837891286.png */}
      <div
        data-layer="Section-Header"
        className="SectionHeader self-stretch hidden md:flex justify-between items-center"
      >
        {/* Left: Mark All as Read button */}
        <div data-layer="Action Left" className="ActionLeft">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl outline outline-1 outline-offset-[-1px] outline-blue-900 hover:outline-sky-400 text-slate-300 hover:text-white text-sm font-medium font-['Tajawal'] transition-all cursor-pointer shadow-sm"
          >
            تحديد الكل كمقروء
          </button>
        </div>

        {/* Right: Title & Unread Count info */}
        <div data-layer="Header Title Info" className="HeaderTitleInfo flex flex-col justify-start items-start text-right gap-1">
          <h2 data-layer="مركز الإشعارات" className="text-slate-200 text-2xl font-bold font-['Cairo']">
            مركز الإشعارات
          </h2>
          <span data-layer="لديك تنبيهات جديدة" className="text-slate-400 text-sm font-normal font-['Tajawal']">
            {unreadCount > 0 ? `لديك ${unreadCount} تنبيهات جديدة غير مقروءة` : 'لا توجد تنبيهات جديدة غير مقروءة'}
          </span>
        </div>
      </div>

      {/* Notification-List matching Figma & Screenshots */}
      <div data-layer="Notification-List" className="NotificationList self-stretch flex flex-col justify-start items-start gap-3">
        {notifications.map((item) => (
          <div
            key={item.id}
            data-layer="Notification Item"
            onClick={() => handleToggleRead(item.id, item)}
            className={`NotificationItem self-stretch p-3.5 md:p-4 rounded-2xl outline outline-1 outline-offset-[-1px] flex justify-between items-center gap-3 md:gap-5 transition-all cursor-pointer relative group ${
              item.isUnread
                ? 'bg-slate-900 outline-sky-400/40 shadow-[0_4px_20px_rgba(41,169,255,0.06)]'
                : 'bg-blue-950/60 outline-blue-900/60 opacity-85 hover:opacity-100'
            }`}
          >
            {/* Mobile-only Top-Right Unread Indicator Dot (matching media_1789837891270.png) */}
            {item.isUnread && (
              <span className="md:hidden absolute top-3.5 right-3.5 size-2 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(41,169,255,0.9)]" />
            )}

            {/* Right side in RTL: Category Icon + Message text */}
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 text-right">
              {/* Category Icon Container */}
              <div
                data-layer="Icon Container"
                className="IconContainer size-10 md:size-12 bg-slate-900 rounded-full flex justify-center items-center shrink-0 border border-blue-900/60 shadow-inner group-hover:border-sky-400/40 transition-colors"
              >
                {item.type === 'live' && (
                  <Bell size={18} className="text-red-400" strokeWidth={2} />
                )}
                {item.type === 'scholarship' && (
                  <Award size={18} className="text-[#E5B65C]" strokeWidth={2} />
                )}
                {item.type === 'exam' && (
                  <BookOpen size={18} className="text-sky-400" strokeWidth={2} />
                )}
                {item.type === 'competition' && (
                  <Trophy size={18} className="text-emerald-400" strokeWidth={2} />
                )}
                {item.type === 'lesson' && (
                  <BookOpen size={18} className="text-sky-400" strokeWidth={2} />
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

            {/* Desktop-only Left side in RTL: Unread Indicator Dot (matching media_1789837891286.png) */}
            <div data-layer="Indicator Section" className="hidden md:flex shrink-0 items-center justify-center size-4">
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
