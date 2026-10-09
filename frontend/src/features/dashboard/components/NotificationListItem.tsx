import React from 'react';
import { Radio, Award, BookOpen, Trophy, Bell, type LucideIcon } from 'lucide-react';

export type NotificationKind =
  | 'live'
  | 'scholarship'
  | 'exam'
  | 'competition'
  | 'lesson'
  | 'application';

interface NotificationListItemProps {
  text: string;
  timeAgo: string;
  type: NotificationKind;
  unread?: boolean;
  onClick?: () => void;
  /** Position in the list, used to stagger the entrance. */
  index?: number;
}

/** Icon badge spec per notification type; application mirrors scholarship. */
const NOTIF_TYPES: Record<NotificationKind, { Icon: LucideIcon; badge: string; tone: string }> = {
  live: { Icon: Radio, badge: 'border-red-500/40', tone: 'text-red-500' },
  scholarship: { Icon: Award, badge: 'border-gold-400/40', tone: 'text-gold-400' },
  application: { Icon: Award, badge: 'border-gold-400/40', tone: 'text-gold-400' },
  competition: { Icon: Trophy, badge: 'border-emerald-500/40', tone: 'text-emerald-500' },
  exam: { Icon: BookOpen, badge: 'border-blue-400/40', tone: 'text-blue-400' },
  lesson: { Icon: BookOpen, badge: 'border-blue-400/40', tone: 'text-blue-400' },
};

/** Defensive badge for unexpected types at runtime. */
const FALLBACK_BADGE = { Icon: Bell, badge: 'border-blue-500/40', tone: 'text-blue-400' };

export const NotificationListItem: React.FC<NotificationListItemProps> = ({
  text,
  timeAgo,
  type,
  unread = false,
  onClick,
  index = 0,
}) => {
  const { Icon, badge, tone } = NOTIF_TYPES[type] ?? FALLBACK_BADGE;

  return (
    <div
      dir="rtl"
      onClick={onClick}
      className={`dash-notif group ${unread ? 'dash-notif-unread' : 'dash-notif-read'} animate-pop-in`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {unread && <span className="dash-notif-dot" />}

      <div className={`dash-notif-badge ${badge}`}>
        <Icon size={18} strokeWidth={2} className={tone} />
      </div>

      <div className="dash-notif-body">
        <p
          className={`dash-notif-text ${unread ? 'dash-notif-text-unread' : 'dash-notif-text-read'}`}
        >
          {text}
        </p>
        <span className="dash-notif-time">{timeAgo}</span>
      </div>
    </div>
  );
};
