import React from 'react';

export const AnalyticsSkeleton: React.FC = () => <div className="studio-analytics-skeleton" aria-label="جاري تحميل التحليلات"><div className="studio-analytics-skeleton-kpis">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div><div className="studio-analytics-skeleton-row"><span /><span /></div><div className="studio-analytics-skeleton-row"><span /><span /></div></div>;
