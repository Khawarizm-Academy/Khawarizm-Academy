import React from 'react';
import { useCachedData } from '../../../shared/hooks/useCachedData';
import { DataSectionSkeleton } from '../../../shared/components/Loading/DataSectionSkeleton';
import { fetchDashboardStats, fetchUpcomingEvents } from '../data/dashboardFetchers';
import type { DashboardStats, UpcomingEvent } from '../types';

export const DashboardStatsSidebar: React.FC = () => {
  const { data: stats, isLoading: isLoadingStats } = useCachedData<DashboardStats>(
    ['dashboard', 'stats'],
    fetchDashboardStats,
    { initialData: null as unknown as DashboardStats }
  );

  const { data: events, isLoading: isLoadingEvents } = useCachedData<UpcomingEvent[]>(
    ['dashboard', 'upcoming-events'],
    fetchUpcomingEvents,
    { initialData: [] }
  );

  return (
    <aside
      dir="rtl"

      className="w-full md:w-96 flex flex-col justify-start items-start gap-6 shrink-0"
    >
      {/* 1. Achievement Stats Widget Card */}
      <div

        className="workspace-card self-stretch p-6"
      >
        <h3

          className="text-right text-orange-300 text-lg font-bold font-['IBM_Plex_Sans_Arabic'] leading-6"
        >
          إحصائيات الإنجاز
        </h3>

        {isLoadingStats ? (
          <DataSectionSkeleton variant="rail" count={1} className="flex-col" />
        ) : (
          <div className="self-stretch flex flex-col justify-start items-start gap-3">
          {/* Row 1: Attendance */}
          <div

            className="self-stretch p-3 bg-slate-900/90 rounded-xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center"
          >
            {/* Right: Label in RTL */}
            <span

              className="text-right text-slate-200 text-sm md:text-base font-medium font-['Tajawal'] leading-6"
            >
              معدل الحضور
            </span>

            {/* Left: Value Group in RTL */}
            <div

              className="flex flex-col justify-start items-start gap-0.5 text-left"
            >
              <span

                className="text-sky-400 text-base font-bold font-['Tajawal'] leading-6"
              >
                {stats.attendanceRate}%
              </span>
              <span

                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                {stats.attendanceNote}
              </span>
            </div>
          </div>

          {/* Row 2: GPA */}
          <div

            className="self-stretch p-3 bg-slate-900/90 rounded-xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center"
          >
            {/* Right: Label in RTL */}
            <span

              className="text-right text-slate-200 text-sm md:text-base font-medium font-['Tajawal'] leading-6"
            >
              المعدل التراكمي
            </span>

            {/* Left: Value Group in RTL */}
            <div

              className="flex flex-col justify-start items-start gap-0.5 text-left"
            >
              <span

                className="text-[#E5B65C] text-base font-bold font-['Tajawal'] leading-6"
              >
                {stats.gpa}
              </span>
              <span

                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                {stats.gpaRating}
              </span>
            </div>
          </div>

          {/* Row 3: Earned Points */}
          <div

            className="self-stretch p-3 bg-slate-900/90 rounded-xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center"
          >
            {/* Right: Label in RTL */}
            <span

              className="text-right text-slate-200 text-sm md:text-base font-medium font-['Tajawal'] leading-6"
            >
              النقاط المكتسبة
            </span>

            {/* Left: Value Group in RTL */}
            <div

              className="flex flex-col justify-start items-start gap-0.5 text-left"
            >
              <span

                className="text-emerald-400 text-base font-bold font-['Tajawal'] leading-6"
              >
                {stats.pointsEarned.toLocaleString('en-US')} نقطة
              </span>
              <span

                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                {stats.rankNote}
              </span>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* 2. Upcoming Events Widget Card */}
      <div

        className="workspace-card self-stretch p-6"
      >
        <h3

          className="text-right text-[#E5B65C] text-lg font-bold font-['IBM_Plex_Sans_Arabic'] leading-6"
        >
          الأحداث الهامة القادمة
        </h3>

        {isLoadingEvents ? (
          <DataSectionSkeleton variant="list" count={2} />
        ) : (
          <div className="self-stretch flex flex-col justify-start items-start gap-3">
            {events.map((event) => {
              const isSubmission = event.type === 'submission';
              const isExam = event.type === 'exam';
              const tagClass = isExam
                ? 'bg-sky-400/10 border-sky-400/20 text-sky-400'
                : isSubmission
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-[#E5B65C]/10 border-[#E5B65C]/20 text-[#E5B65C]';
              return (
                <div
                  key={event.id}

                  className="self-stretch p-3 bg-slate-900/90 rounded-xl border border-blue-900/50 flex justify-between items-center gap-3"
                >
                  {/* Right: Event Details in RTL */}
                  <div className="flex-1 flex flex-col justify-start items-start gap-0.5 text-right">
                    <h4

                      className="text-slate-200 text-sm font-bold font-['Tajawal'] leading-5 truncate w-full"
                    >
                      {event.title}
                    </h4>
                    <span

                      className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
                    >
                      {event.dateText}
                    </span>
                  </div>

                  {/* Left: Type Tag in RTL */}
                  <div

                    className={`px-2 py-1 rounded-md flex justify-center items-center shrink-0 border ${tagClass}`}
                  >
                    <span

                      className="text-xs font-bold font-['Tajawal'] leading-4"
                    >
                      {event.typeLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
