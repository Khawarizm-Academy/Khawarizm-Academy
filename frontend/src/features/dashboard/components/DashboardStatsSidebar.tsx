import React from 'react';
import { useCachedData } from '../../../shared/hooks/useCachedData';
import { DataSectionSkeleton } from '../../../shared/components/Loading/DataSectionSkeleton';
import { fetchDashboardStats, fetchUpcomingEvents } from '../data/dashboardFetchers';
import type { DashboardStats, UpcomingEvent } from '../types';

/** Label, value and note per achievement stat; rows read live values from stats. */
const STAT_ROWS = [
  {
    label: 'معدل الحضور',
    value: (s: DashboardStats) => `${s.attendanceRate}%`,
    note: (s: DashboardStats) => s.attendanceNote,
    tone: 'text-blue-400',
  },
  {
    label: 'المعدل التراكمي',
    value: (s: DashboardStats) => s.gpa,
    note: (s: DashboardStats) => s.gpaRating,
    tone: 'text-gold-400',
  },
  {
    label: 'النقاط المكتسبة',
    value: (s: DashboardStats) => `${s.pointsEarned.toLocaleString('en-US')} نقطة`,
    note: (s: DashboardStats) => s.rankNote,
    tone: 'text-emerald-400',
  },
];

/** Tag tone per upcoming-event type; session is the fallback. */
const EVENT_TAG_TONE: Record<string, string> = {
  exam: 'bg-blue-400/10 border-blue-400/20 text-blue-400',
  submission: 'bg-red-500/10 border-red-500/20 text-red-400',
  session: 'bg-gold-400/10 border-gold-400/20 text-gold-400',
};

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
    <aside dir="rtl" className="w-full md:w-96 flex flex-col justify-start items-start gap-6 shrink-0">
      {/* Achievement stats widget */}
      <div className="workspace-card dash-widget">
        <h3 className="dash-widget-title">إحصائيات الإنجاز</h3>

        {isLoadingStats ? (
          <DataSectionSkeleton variant="rail" count={1} className="flex-col" />
        ) : (
          <div className="dash-stat-stack">
            {STAT_ROWS.map((row, idx) => (
              <div
                key={row.label}
                className="dash-stat-row animate-pop-in"
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <span className="dash-stat-label">{row.label}</span>
                <div className="dash-stat-values">
                  <span className={`dash-stat-value ${row.tone}`}>{row.value(stats)}</span>
                  <span className="dash-meta">{row.note(stats)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming events widget */}
      <div className="workspace-card dash-widget">
        <h3 className="dash-widget-title">الأحداث الهامة القادمة</h3>

        {isLoadingEvents ? (
          <DataSectionSkeleton variant="list" count={2} />
        ) : (
          <div className="dash-stat-stack">
            {events.map((event, idx) => (
              <div
                key={event.id}
                className="dash-event-row animate-pop-in"
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                {/* Right: event details in RTL */}
                <div className="dash-event-text">
                  <h4 className="dash-event-title">{event.title}</h4>
                  <span className="dash-meta">{event.dateText}</span>
                </div>

                {/* Left: type tag in RTL */}
                <div className={`dash-event-tag ${EVENT_TAG_TONE[event.type] ?? EVENT_TAG_TONE.session}`}>
                  <span className="dash-event-tag-label">{event.typeLabel}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
