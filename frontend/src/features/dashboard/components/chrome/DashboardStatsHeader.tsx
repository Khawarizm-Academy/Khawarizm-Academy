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
  /** The real signed-in learner's first name; the header never invents one. */
  studentName: string;
  /** True when `title` is a greeting placeholder and must be suffixed with the name. */
  greeting?: boolean;
  unreadNotificationsCount?: number;
  onNotificationsClick?: () => void;
  onAvatarClick?: () => void;
  onSavedClick?: () => void;
  isSavedActive?: boolean;
}

/** One reminder token; the same markup serves the mobile scroller and desktop row. */
const StatChip: React.FC<{ chip: StatChipItem; index: number }> = ({ chip, index }) => {
  const Icon = chip.icon;
  const state = chip.onClick ? 'dash-chip-click' : 'dash-chip-static';

  return (
    <button
      type="button"
      onClick={chip.onClick}
      className={`dash-chip group ${state} animate-pop-in`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="dash-chip-badge">
        <Icon size={15} className={chip.iconColor || 'text-blue-400'} strokeWidth={2.2} />
      </span>
      <span className="dash-chip-label">{chip.label}</span>
    </button>
  );
};

/** The mobile reminder scroller, rendered below the sub-nav so it never shifts the strip. */
export const DashboardMobileChips: React.FC<{ chips: StatChipItem[] }> = ({ chips }) => (
  <div className="dash-chip-row">
    {chips.map((chip, idx) => (
      <StatChip key={idx} chip={chip} index={idx} />
    ))}
  </div>
);

export const DashboardStatsHeader: React.FC<DashboardStatsHeaderProps> = ({
  title,
  subtitle,
  chips,
  studentName,
  greeting = false,
  unreadNotificationsCount = 0,
  onNotificationsClick,
  onAvatarClick,
  onSavedClick,
  isSavedActive = false,
}) => (
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

    {/* Desktop stats row: welcome message on the right, chips on the left */}
    <div className="dash-stats-row">
      <div className="dash-greet">
        <h1 className="dash-greet-title">{greeting ? `${title}، ${studentName}` : title}</h1>
        <p className="dash-greet-sub">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {chips.map((chip, idx) => (
          <StatChip key={idx} chip={chip} index={idx} />
        ))}
      </div>
    </div>
  </div>
);
