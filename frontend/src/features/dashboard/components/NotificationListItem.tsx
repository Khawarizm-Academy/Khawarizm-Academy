import React from 'react';
import { Radio, Award, BookOpen, Trophy, Bell } from 'lucide-react';

export type NotificationKind = 'live' | 'scholarship' | 'exam' | 'competition' | 'lesson' | 'application';

interface NotificationListItemProps {
  text: string;
  timeAgo: string;
  type: NotificationKind;
  unread?: boolean;
  onClick?: () => void;
}

function getNotificationIcon(type: NotificationKind) {
  const badge = 'size-10 shrink-0 rounded-full bg-[#061A3A] border flex items-center justify-center';
  switch (type) {
    case 'live':
      return (
        <div className={`${badge} border-red-500/40`}>
          <Radio size={18} strokeWidth={2} className="text-red-500" />
        </div>
      );
    case 'scholarship':
    case 'application':
      return (
        <div className={`${badge} border-[#E5B65C]/40`}>
          <Award size={18} strokeWidth={2} className="text-[#E5B65C]" />
        </div>
      );
    case 'competition':
      return (
        <div className={`${badge} border-emerald-500/40`}>
          <Trophy size={18} strokeWidth={2} className="text-emerald-500" />
        </div>
      );
    case 'exam':
    case 'lesson':
      return (
        <div className={`${badge} border-[#29A9FF]/40`}>
          <BookOpen size={18} strokeWidth={2} className="text-[#29A9FF]" />
        </div>
      );
    default:
      return (
        <div className={`${badge} border-[#167BDB]/40`}>
          <Bell size={18} strokeWidth={2} className="text-[#29A9FF]" />
        </div>
      );
  }
}

export const NotificationListItem: React.FC<NotificationListItemProps> = ({
  text,
  timeAgo,
  type,
  unread = false,
  onClick,
}) => (
  <div
    dir="rtl"
    onClick={onClick}
    className={`relative flex items-center gap-3.5 p-3.5 md:p-4 rounded-2xl transition-all cursor-pointer group ${
      unread
        ? 'bg-slate-900 outline outline-1 outline-sky-400/40 shadow-[0_4px_20px_rgba(41,169,255,0.06)]'
        : 'bg-blue-950/60 border border-blue-900/50 opacity-90 hover:opacity-100'
    }`}
  >
    {unread && (
      <span className="absolute top-3.5 left-3 size-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(41,169,255,0.9)]" />
    )}

    {getNotificationIcon(type)}

    <div className="flex-1 flex flex-col gap-1 text-right">
      <p
        className={`text-xs sm:text-sm font-['Tajawal'] leading-relaxed ${
          unread ? 'text-white font-medium' : 'text-slate-200'
        }`}
      >
        {text}
      </p>
      <span className="text-[11px] text-slate-400 font-['Tajawal']">{timeAgo}</span>
    </div>
  </div>
);