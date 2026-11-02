import React from 'react';
import { AnalyticsDataTable } from './AnalyticsDataTable';
import type { LessonWatchPoint } from '@/features/studio/analytics/types';

const number = new Intl.NumberFormat('ar');

export const LessonHeatStrip: React.FC<{ lessons: LessonWatchPoint[] }> = ({ lessons }) => (
  <section className="studio-analytics-chart" aria-labelledby="analytics-watch-title">
    <div className="studio-analytics-chart-head"><h2 id="analytics-watch-title">متوسط المشاهدة لكل درس</h2><span>مؤشر التغطية</span></div>
    {lessons.length ? <div className="studio-analytics-heat" role="list" aria-label="شريط حرارة متوسط المشاهدة">
      {lessons.map((lesson) => {
        const value = lesson.averageWatchPercent;
        const safe = value === null ? 0 : Math.max(0, Math.min(100, value));
        return <div className="studio-analytics-heat-cell" role="listitem" key={`${lesson.courseSlug}-${lesson.lessonId}`} title={`${lesson.title}: ${value === null ? 'لا بيانات' : `${number.format(value)}٪`}`} style={{ '--watch': `${safe}%` } as React.CSSProperties}><span>{value === null ? '—' : `${number.format(value)}٪`}</span><small>{lesson.title}</small></div>;
      })}
    </div> : <p className="studio-analytics-chart-empty">لا بيانات كافية بعد</p>}
    <AnalyticsDataTable headers={['الدرس', 'متوسط المشاهدة', 'المتعلّمون']} rows={lessons.map((lesson) => [lesson.title, lesson.averageWatchPercent === null ? '—' : `${number.format(lesson.averageWatchPercent)}٪`, number.format(lesson.learners)])} />
  </section>
);
