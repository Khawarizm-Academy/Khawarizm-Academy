import React from 'react';
import type { DashboardStats, UpcomingEvent } from '../types';

interface DashboardStatsSidebarProps {
  stats: DashboardStats;
  events: UpcomingEvent[];
}

export const DashboardStatsSidebar: React.FC<DashboardStatsSidebarProps> = ({
  stats,
  events,
}) => {
  return (
    <aside className="flex flex-col gap-6 w-full">
      {/* 1. Achievement Stats Widget */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-[#1B3F80]/50 shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex flex-col gap-4">
        <h3 className="text-lg font-bold text-[#E5B65C] font-['Cairo',sans-serif]">
          إحصائيات الإنجاز
        </h3>

        <div className="flex flex-col gap-3">
          {/* Attendance Rate */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#040F24]/80 border border-[#167BDB]/25">
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-sm font-medium text-[#DCE5EE] font-['Tajawal']">
                معدل الحضور
              </span>
              <span className="text-[11px] text-[#8299B5] font-['Tajawal']">
                {stats.attendanceNote}
              </span>
            </div>
            <span className="text-lg font-bold text-[#29A9FF] font-['Cairo']" dir="ltr">
              {stats.attendanceRate}%
            </span>
          </div>

          {/* Cumulative GPA */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#040F24]/80 border border-[#167BDB]/25">
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-sm font-medium text-[#DCE5EE] font-['Tajawal']">
                المعدل التراكمي
              </span>
              <span className="text-[11px] text-[#8299B5] font-['Tajawal']">
                {stats.gpaRating}
              </span>
            </div>
            <span className="text-lg font-bold text-[#E5B65C] font-['Cairo']" dir="ltr">
              {stats.gpa}
            </span>
          </div>

          {/* Earned Points & Class Rank */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#040F24]/80 border border-[#167BDB]/25">
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-sm font-medium text-[#DCE5EE] font-['Tajawal']">
                النقاط المكتسبة
              </span>
              <span className="text-[11px] text-[#8299B5] font-['Tajawal']">
                {stats.rankNote}
              </span>
            </div>
            <span className="text-lg font-bold text-[#10B981] font-['Cairo']">
              {stats.pointsEarned.toLocaleString('ar-EG')} نقطة
            </span>
          </div>
        </div>
      </div>

      {/* 2. Upcoming Important Events Widget */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-[#1B3F80]/50 shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#E5B65C] font-['Cairo',sans-serif]">
            الأحداث الهامة القادمة
          </h3>
          <span className="text-xs text-[#8299B5] font-['Tajawal']">
            {events.length} مجدولة
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {events.map((evt) => {
            const isSubmission = evt.type === 'submission';
            return (
              <div
                key={evt.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#040F24]/80 border border-[#1B3F80]/40 hover:border-[#167BDB]/50 transition-colors"
              >
                {/* Event Title & Date on the Right in RTL */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1 text-right">
                  <h4 className="text-xs sm:text-sm font-bold text-[#DCE5EE] font-['Cairo'] truncate">
                    {evt.title}
                  </h4>
                  <span className="text-[11px] text-[#8299B5] font-['Tajawal']">
                    {evt.dateText}
                  </span>
                </div>

                {/* Event Type Badge on the Left in RTL */}
                <span
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-['Tajawal'] shrink-0 ${
                    isSubmission
                      ? 'bg-[#FF4D4D]/15 text-[#FF6B6B] border border-[#FF4D4D]/30'
                      : 'bg-[#29A9FF]/15 text-[#29A9FF] border border-[#29A9FF]/30'
                  }`}
                >
                  {evt.typeLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
