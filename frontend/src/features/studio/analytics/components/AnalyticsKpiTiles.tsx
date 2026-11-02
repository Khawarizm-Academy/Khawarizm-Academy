import React from 'react';
import { Activity, Award, CheckCircle2, UserPlus, UsersRound } from 'lucide-react';
import type { AnalyticsMetric } from '@/features/studio/analytics/types';

const number = new Intl.NumberFormat('ar');

interface AnalyticsKpiTilesProps {
  metrics: {
    enrollments: AnalyticsMetric;
    activeLearners: AnalyticsMetric;
    completionRate: AnalyticsMetric;
    averageWatchPercent: AnalyticsMetric;
    certificates: AnalyticsMetric;
  };
}

const cards = [
  ['enrollments', 'تسجيلات جديدة', UserPlus, 'blue', 'count'],
  ['activeLearners', 'متعلّمون نشطون', UsersRound, 'cyan', 'count'],
  ['completionRate', 'معدل الإكمال', CheckCircle2, 'gold', 'percent'],
  ['averageWatchPercent', 'متوسط المشاهدة', Activity, 'cyan', 'percent'],
  ['certificates', 'شهادات مُصدرة', Award, 'gold', 'count'],
] as const;

export const AnalyticsKpiTiles: React.FC<AnalyticsKpiTilesProps> = ({ metrics }) => (
  <section className="studio-analytics-kpi-grid" aria-label="مؤشرات التحليلات">
    {cards.map(([key, label, Icon, tone, format]) => {
      const metric = metrics[key];
      const value = metric.value === null ? '—' : format === 'percent' ? `${number.format(metric.value)}٪` : number.format(metric.value);
      const delta = metric.delta === null ? null : `${metric.delta > 0 ? '+' : ''}${number.format(metric.delta)}${format === 'percent' ? ' نقطة' : ''}`;
      return (
        <article className={`studio-analytics-kpi studio-analytics-kpi-${tone}`} key={key}>
          <span className="studio-analytics-kpi-icon"><Icon size={18} aria-hidden="true" /></span>
          <div>
            <span className="studio-analytics-kpi-label">{label}</span>
            <strong className="studio-analytics-kpi-value">{value}</strong>
            <span className={`studio-analytics-kpi-delta ${metric.delta !== null && metric.delta < 0 ? 'is-negative' : ''}`}>
              {metric.deltaAvailable && delta ? `${delta} عن الفترة السابقة` : 'المقارنة غير متاحة بعد'}
            </span>
          </div>
        </article>
      );
    })}
  </section>
);
