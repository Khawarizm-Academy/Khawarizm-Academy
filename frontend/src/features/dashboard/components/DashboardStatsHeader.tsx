import React from 'react';
import { Bell, Bookmark, User, type LucideIcon } from 'lucide-react';

export interface StatChipItem {
  icon: LucideIcon;
  label: string;
  iconColor?: string;
  onClick?: () => void;
}

interface DashboardStatsHeaderProps {
  title: string;
  subtitle: string;
  chips: StatChipItem[];
  studentName?: string;
  unreadNotificationsCount?: number;
  onNotificationsClick?: () => void;
  onAvatarClick?: () => void;
  onSavedClick?: () => void;
  isSavedActive?: boolean;
}

export const DashboardStatsHeader: React.FC<DashboardStatsHeaderProps> = ({
  title,
  subtitle,
  chips,
  studentName = 'أحمد',
  unreadNotificationsCount = 5,
  onNotificationsClick,
  onAvatarClick,
  onSavedClick,
  isSavedActive = false,
}) => {
  const chipState = (chip: StatChipItem) => (chip.onClick ? 'dash-chip-click' : 'cursor-default');

  return (
    <div dir="rtl" className="dash-stats-head">
      {/* Mobile header matching the Figma mobile screenshot */}
      <div className="dash-mtop">
        {/* Right: user avatar + greeting */}
        <button
          type="button"
          onClick={onAvatarClick}
          className="dash-mtop-title cursor-pointer group"
        >
          <div className="dash-avatar">
            <User size={18} className="text-blue-400" />
          </div>
          <span className="dash-mtop-label group-hover:text-sky-300 transition-colors">
            مرحبًا، {studentName}
          </span>
        </button>

        {/* Left: saved (bookmark) + notification bell */}
        <div className="flex items-center gap-2">
          {onSavedClick && (
            <button
              type="button"
              onClick={onSavedClick}
              title="المحفوظات"
              className={`dash-bell relative ${isSavedActive ? 'dash-bell-active' : 'dash-bell-idle'}`}
            >
              <Bookmark size={18} strokeWidth={2} />
            </button>
          )}

          <button
            type="button"
            onClick={onNotificationsClick}
            title="الإشعارات"
            className="dash-bell dash-bell-idle relative"
          >
            <Bell size={18} strokeWidth={2} />
            {unreadNotificationsCount > 0 && (
              <div className="dash-bell-badge -top-1 -right-1">
                <span className="dash-bell-count">{unreadNotificationsCount}</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Mobile stat chips horizontal scrollable row */}
      <div className="dash-chip-row">
        {chips.map((chip, idx) => {
          const Icon = chip.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={chip.onClick}
              className={`dash-chip dash-chip-mobile ${chipState(chip)} animate-pop-in`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <Icon size={16} className={chip.iconColor || 'text-blue-400'} strokeWidth={2} />
              <span className="dash-chip-label">{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop stats row: welcome message on the right, chips on the left */}
      <div className="dash-stats-row">
        <div className="dash-greet">
          <h1 className="dash-greet-title">{title}</h1>
          <p className="dash-greet-sub">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {chips.map((chip, idx) => {
            const Icon = chip.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={chip.onClick}
                className={`dash-chip dash-chip-desktop ${chipState(chip)} animate-pop-in`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <Icon size={18} className={chip.iconColor || 'text-blue-400'} strokeWidth={2} />
                <span className="dash-chip-label-lg">{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
