import React from 'react';
import { AnalyticsDataTable } from './AnalyticsDataTable';
import type { AnalyticsSeriesPoint } from '@/features/studio/analytics/types';

const number = new Intl.NumberFormat('ar');
const day = (value: string) => new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`));

export const AnalyticsLineChart: React.FC<{ title: string; series: AnalyticsSeriesPoint[]; tone?: 'blue' | 'gold' }> = ({ title, series, tone = 'blue' }) => {
  const width = 720;
  const height = 220;
  const pad = { top: 20, right: 18, bottom: 32, left: 34 };
  const max = Math.max(...series.map((point) => point.value), 0);
  const step = series.length > 1 ? (width - pad.left - pad.right) / (series.length - 1) : 0;
  const points = series.map((point, index) => `${pad.left + index * step},${height - pad.bottom - (max ? (point.value / max) * (height - pad.top - pad.bottom) : 0)}`).join(' ');
  const labelStep = Math.max(1, Math.ceil(series.length / 6));
  const rows = series.map((point) => [day(point.date), number.format(point.value)]);

  return (
    <section className="studio-analytics-chart" aria-labelledby={`analytics-line-${title}`}>
      <div className="studio-analytics-chart-head"><h2 id={`analytics-line-${title}`}>{title}</h2><span>يوميًا</span></div>
      {series.some((point) => point.value > 0) ? (
        <div className="studio-analytics-svg-wrap">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: ${number.format(series.reduce((sum, point) => sum + point.value, 0))} إجماليًا`} preserveAspectRatio="none">
            {[0, 0.5, 1].map((ratio) => <line key={ratio} x1={pad.left} x2={width - pad.right} y1={height - pad.bottom - ratio * (height - pad.top - pad.bottom)} y2={height - pad.bottom - ratio * (height - pad.top - pad.bottom)} className="studio-analytics-gridline" />)}
            <polyline points={points} className={`studio-analytics-line studio-analytics-line-${tone}`} fill="none" />
            {series.map((point, index) => {
              const y = height - pad.bottom - (max ? (point.value / max) * (height - pad.top - pad.bottom) : 0);
              return <circle key={point.date} cx={pad.left + index * step} cy={y} r="3.5" className={`studio-analytics-point studio-analytics-point-${tone}`}><title>{`${day(point.date)} · ${number.format(point.value)}`}</title></circle>;
            })}
            {series.map((point, index) => index % labelStep === 0 || index === series.length - 1 ? <text key={point.date} x={pad.left + index * step} y={height - 8} className="studio-analytics-axis-label" textAnchor="middle">{day(point.date)}</text> : null)}
          </svg>
        </div>
      ) : <p className="studio-analytics-chart-empty">لا بيانات كافية بعد</p>}
      <AnalyticsDataTable headers={['اليوم', 'القيمة']} rows={rows} />
    </section>
  );
};
