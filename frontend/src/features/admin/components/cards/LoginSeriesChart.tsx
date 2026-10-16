import React from 'react';
import { formatCount, formatDayLabel } from '@/features/admin/data/adminFormatters';
import type { LoginSeries } from '@/features/admin/types';

interface LoginSeriesChartProps {
  series: LoginSeries;
}

/** Bars grow from the busiest day down to zero; empty days stay visible. */
export const LoginSeriesChart: React.FC<LoginSeriesChartProps> = ({ series }) => {
  const busiest = series.points.reduce((highest, point) => Math.max(highest, point.count), 0);
  // Keep the axis readable: at most ~9 date labels whatever the range is.
  const labelStep = Math.max(1, Math.ceil(series.points.length / 9));

  return (
    <div className="admin-chart">
      <div className="admin-chart-bars" role="img" aria-label={`تسجيلات الدخول خلال ${formatCount(series.days)} يومًا`}>
        {series.points.map((point, index) => {
          // Cap at 88% so the busiest bar's own label still fits above it.
          const height = busiest === 0 ? 0 : Math.max(5, Math.round((point.count / busiest) * 88));
          const showLabel = index % labelStep === 0 || index === series.points.length - 1;
          return (
            <div
              key={point.date}
              className="admin-chart-col"
              title={`${formatDayLabel(point.date)} · ${formatCount(point.count)} دخول`}
            >
              <span className="admin-chart-track">
                <span className="admin-chart-count">{point.count > 0 ? formatCount(point.count) : ''}</span>
                <span className="admin-chart-bar" style={{ height: `${height}%` }} />
              </span>
              <span className="admin-chart-day">{showLabel ? formatDayLabel(point.date) : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
