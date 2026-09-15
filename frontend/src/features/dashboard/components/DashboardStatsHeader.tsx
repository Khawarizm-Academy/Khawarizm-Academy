import React from 'react';

export interface StatChipItem {
  icon: string;
  label: string;
}

interface DashboardStatsHeaderProps {
  title: string;
  subtitle: string;
  chips: StatChipItem[];
  studentName?: string;
  unreadNotificationsCount?: number;
  onNotificationsClick?: () => void;
  onAvatarClick?: () => void;
}

export const DashboardStatsHeader: React.FC<DashboardStatsHeaderProps> = ({
  title,
  subtitle,
  chips,
  studentName = 'أحمد',
  unreadNotificationsCount = 5,
  onNotificationsClick,
  onAvatarClick,
}) => {
  return (
    <div dir="rtl" className="w-full flex flex-col gap-4">
      {/* 1. Mobile Header matching media_1789337356526.png */}
      <div className="flex md:hidden justify-between items-center w-full py-1">
        {/* Right: User Avatar + Greeting */}
        <button
          type="button"
          onClick={onAvatarClick}
          className="flex items-center gap-2.5 text-right cursor-pointer group"
        >
          <div className="size-9 rounded-full bg-[#061A3A] border border-blue-900 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-sky-400 transition-colors">
            {/* Celestial spiral / avatar mark matching mobile image */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="8" stroke="#E5B65C" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="10" cy="10" r="4" fill="#29A9FF" />
            </svg>
          </div>
          <span className="text-slate-200 text-lg font-bold font-['Cairo'] group-hover:text-sky-300 transition-colors">
            مرحبًا، {studentName}
          </span>
        </button>

        {/* Left: Mobile Notification Bell matching media_1789337356526.png */}
        <button
          type="button"
          onClick={onNotificationsClick}
          title="الإشعارات"
          className="size-10 relative bg-slate-900 rounded-full outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-center items-center cursor-pointer hover:outline-sky-400 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M9 1C10.4 1 11.7 1.5 12.6 2.5C13.6 3.5 14.1 4.7 14.1 6C14.1 8.4 14.5 10 15 11.3C15.7 12.5 16.4 13.3 17.1 14H0.9C1.6 13.3 2.3 12.5 3 11.3C3.5 10 3.9 8.4 3.9 6C3.9 4.7 4.4 3.5 5.4 2.5C6.3 1.5 7.6 1 9 1Z"
              stroke="#8299B5"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          {unreadNotificationsCount > 0 && (
            <div className="px-1.5 py-0.5 -top-1 -right-1 absolute bg-red-500 rounded-full inline-flex justify-center items-center shadow-sm">
              <span className="text-white text-[10px] font-bold leading-none">
                {unreadNotificationsCount}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* 2. Mobile Stat Chips Horizontal Scrollable Row */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {chips.map((chip, idx) => (
          <div
            key={idx}
            className="shrink-0 px-4 py-2 bg-blue-950/80 rounded-full outline outline-1 outline-offset-[-1px] outline-blue-900 flex items-center gap-2"
          >
            <span className="text-base">{chip.icon}</span>
            <span className="text-slate-200 text-xs font-medium font-['Tajawal'] whitespace-nowrap">
              {chip.label}
            </span>
          </div>
        ))}
      </div>

      {/* 3. Desktop Stats-Row matching lines 32-66 of Main - Dashboard - Desktop.html */}
      <div
        data-layer="Stats-Row"
        className="StatsRow self-stretch hidden md:flex justify-between items-center gap-6"
      >
        {/* Chips on Left in RTL */}
        <div className="flex items-center gap-3 flex-wrap">
          {chips.map((chip, idx) => (
            <div
              key={idx}
              data-layer="Stat-Chip"
              className="StatChip px-5 py-3 bg-blue-950 rounded-full outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-start items-center gap-3 shadow-sm hover:border-sky-400/40 transition-colors"
            >
              <span className="text-slate-200 text-base font-medium font-['Tajawal'] leading-6">{chip.icon}</span>
              <span className="text-slate-200 text-base font-medium font-['Tajawal'] leading-6">{chip.label}</span>
            </div>
          ))}
        </div>

        {/* Welcome-Msg on Right in RTL */}
        <div data-layer="Welcome-Msg" className="WelcomeMsg flex flex-col justify-start items-start text-right gap-1 shrink-0">
          <h1
            data-layer={title}
            className="text-slate-200 text-2xl font-bold font-['Cairo'] leading-8"
          >
            {title}
          </h1>
          <p
            data-layer={subtitle}
            className="text-slate-400 text-sm font-medium font-['Tajawal'] leading-5"
          >
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
