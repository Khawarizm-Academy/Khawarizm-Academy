import React from 'react';
import { METRIC_ICONS, formatCount } from '@/features/admin/data/adminFormatters';

export type StatTone = 'sky' | 'gold' | 'emerald' | 'danger';

export interface StatDescriptor {
  /** Key into METRIC_ICONS — one lookup, same as the navigation icon helper. */
  metric: string;
  label: string;
  value: number;
  tone?: StatTone;
}

const TONE_CLASS: Record<StatTone, string> = {
  sky: 'admin-stat-sky',
  gold: 'admin-stat-gold',
  emerald: 'admin-stat-emerald',
  danger: 'admin-stat-danger',
};

interface StatCardProps extends StatDescriptor {
  index?: number;
}

/** One counter tile; the label, value, and tone all arrive as data. */
const StatCard: React.FC<StatCardProps> = ({ metric, label, value, tone = 'sky', index = 0 }) => {
  // Unknown metrics fail loudly instead of silently rendering an empty box.
  const Icon = METRIC_ICONS[metric];
  if (!Icon) throw new Error(`[admin] Unknown metric "${metric}". Add it to METRIC_ICONS in adminFormatters.ts.`);

  return (
    <div className={`admin-stat ${TONE_CLASS[tone]} animate-pop-in`} style={{ animationDelay: `${index * 55}ms` }}>
      <span className="admin-stat-icon">
        <Icon size={17} />
      </span>
      <span className="admin-stat-value">{formatCount(value)}</span>
      <span className="admin-stat-label">{label}</span>
    </div>
  );
};

interface OverviewStatsGridProps {
  stats: StatDescriptor[];
}

/** A row of counters for one dimension of the overview (users / sessions / activity). */
export const OverviewStatsGrid: React.FC<OverviewStatsGridProps> = ({ stats }) => (
  <div className="admin-stat-grid">
    {stats.map((stat, index) => (
      <StatCard key={stat.metric} {...stat} index={index} />
    ))}
  </div>
);
