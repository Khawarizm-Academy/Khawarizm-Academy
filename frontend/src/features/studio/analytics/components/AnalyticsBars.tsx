import React from 'react';
import { AnalyticsDataTable } from './AnalyticsDataTable';

const number = new Intl.NumberFormat('ar');

export interface AnalyticsBarItem { label: string; value: number | null; detail?: string; }

export const AnalyticsBars: React.FC<{ title: string; items: AnalyticsBarItem[]; valueSuffix?: string; tone?: 'blue' | 'gold' }> = ({ title, items, valueSuffix = '', tone = 'blue' }) => {
  const max = Math.max(...items.map((item) => item.value ?? 0), 1);
  const rows = items.map((item) => [item.label, item.value === null ? '—' : `${number.format(item.value)}${valueSuffix}`, item.detail ?? '']);
  return (
    <section className="studio-analytics-chart" aria-labelledby={`analytics-bars-${title}`}>
      <div className="studio-analytics-chart-head"><h2 id={`analytics-bars-${title}`}>{title}</h2><span>{items.length ? `${number.format(items.length)} عناصر` : 'لا بيانات'}</span></div>
      {items.length && items.some((item) => (item.value ?? 0) > 0) ? (
        <div className="studio-analytics-bars" role="img" aria-label={title}>
          {items.map((item) => {
            const value = item.value ?? 0;
            return <div className="studio-analytics-bar-row" key={item.label}><span className="studio-analytics-bar-label">{item.label}</span><span className="studio-analytics-bar-track"><span className={`studio-analytics-bar-fill studio-analytics-bar-fill-${tone}`} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} /></span><strong>{item.value === null ? '—' : `${number.format(item.value)}${valueSuffix}`}</strong>{item.detail && <small>{item.detail}</small>}</div>;
          })}
        </div>
      ) : <p className="studio-analytics-chart-empty">لا بيانات كافية بعد</p>}
      <AnalyticsDataTable headers={['العنصر', 'القيمة', 'ملاحظة']} rows={rows} />
    </section>
  );
};
