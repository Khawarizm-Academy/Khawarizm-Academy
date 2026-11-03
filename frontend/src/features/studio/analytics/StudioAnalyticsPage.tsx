import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useParams, useSearchParams } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { canAny } from '@/shared/lib/permissions';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { StudioShell } from '@/features/studio/components/layout/StudioShell';
import { fetchStudioAnalytics } from './data/analyticsFetchers';
import { AnalyticsBars } from './components/AnalyticsBars';
import { AnalyticsKpiTiles } from './components/AnalyticsKpiTiles';
import { AnalyticsLineChart } from './components/AnalyticsLineChart';
import { LessonHeatStrip } from './components/LessonHeatStrip';
import { AnalyticsSkeleton } from './components/AnalyticsSkeleton';
import { AnalyticsDataTable } from './components/AnalyticsDataTable';
import type { AnalyticsPayload, AnalyticsRange } from './types';
import './analytics.css';

const EMPTY_METRIC = { value: null, delta: null, deltaPercent: null, deltaAvailable: false };
const EMPTY: AnalyticsPayload = {
  scope: 'overview', range: 30, period: { start: '', end: '' }, course: null, courseCount: 0,
  kpis: { enrollments: EMPTY_METRIC, activeLearners: EMPTY_METRIC, completionRate: EMPTY_METRIC, averageWatchPercent: EMPTY_METRIC, certificates: EMPTY_METRIC },
  enrollmentsByDay: [], activeLearnersByDay: [], completionFunnel: [], lessonWatch: [], quizScoreHistogram: [], topMissedQuestions: [],
  certificates: { available: true, count: 0 }, ratings: { available: false, distribution: [], reason: '' }, dataState: 'empty',
};

const isRange = (value: string | null): value is `${AnalyticsRange}` => value === '7' || value === '30' || value === '90';
const number = new Intl.NumberFormat('ar');

export const StudioAnalyticsPage: React.FC<{ courseSlug?: string; embedded?: boolean }> = ({ courseSlug: explicitCourseSlug, embedded = false }) => {
  const { user } = useAuth();
  const { slug: routeCourseSlug } = useParams<{ slug?: string }>();
  const courseSlug = explicitCourseSlug ?? routeCourseSlug;
  const [params, setParams] = useSearchParams();
  const rawRange = params.get('range');
  const range = (isRange(rawRange) ? Number(rawRange) : 30) as AnalyticsRange;
  const allowed = canAny(user, ['analytics.view_own', 'analytics.view_any']);
  const key = ['studio-analytics', user?.id ?? 'anonymous', courseSlug ?? 'overview', range];
  const query = useCachedData<AnalyticsPayload>(key, () => fetchStudioAnalytics(courseSlug, range), { enabled: allowed, initialData: EMPTY, staleTime: 30_000, keepPreviousData: false });
  const data = query.data ?? EMPTY;
  const PageTag = embedded ? 'section' : 'main';
  const wrap = (content: React.ReactNode) => embedded ? content : <StudioShell>{content}</StudioShell>;

  const changeRange = (nextRange: AnalyticsRange) => {
    const next = new URLSearchParams(params);
    next.set('range', String(nextRange));
    setParams(next);
  };

  if (!allowed) return wrap(<PageTag className="studio-analytics-page studio-analytics-forbidden" aria-live="polite">لا تملك صلاحية عرض تحليلات هذه الدورة.</PageTag>);
  if (query.isLoading) return wrap(<PageTag className="studio-analytics-page"><AnalyticsSkeleton /></PageTag>);
  if (query.isError) return wrap(<PageTag className="studio-analytics-page"><div className="studio-analytics-forbidden"><p>تعذّر تحميل التحليلات حاليًا.</p><button type="button" className="btn-outline-blue mt-4" onClick={() => void query.refetch()}><RefreshCw size={15} aria-hidden="true" /> إعادة المحاولة</button></div></PageTag>);

  const funnelItems = data.completionFunnel.map((lesson) => ({ label: `${lesson.order + 1}. ${lesson.title}`, value: lesson.percent, detail: `${number.format(lesson.reached)} من ${number.format(lesson.enrolled)}` }));
  const histogramItems = data.quizScoreHistogram.map((bucket) => ({ label: bucket.bucket, value: bucket.count }));
  const missedRows = data.topMissedQuestions.map((question) => [question.prompt, number.format(question.missed), question.missPercent === null ? '—' : `${number.format(question.missPercent)}٪`]);

  return wrap(
    <PageTag className="studio-analytics-page" aria-labelledby="studio-analytics-title">
      <header className="studio-analytics-toolbar">
        <div className="studio-analytics-context"><span className="studio-kicker">مرصد الأداء</span><h1 id="studio-analytics-title">{data.course?.title ?? 'تحليلات الاستوديو'}</h1><p>{data.course ? 'قراءة تفصيلية لمسار المتعلّمين في هذه الدورة.' : `تجميع ${number.format(data.courseCount)} دورة ضمن صلاحيتك.`}</p></div>
        <div className="studio-analytics-range" aria-label="الفترة الزمنية">
          {[7, 30, 90].map((option) => <button type="button" key={option} className={range === option ? 'is-active' : ''} aria-pressed={range === option} onClick={() => changeRange(option as AnalyticsRange)}>{option} يومًا</button>)}
        </div>
      </header>
      {data.dataState === 'empty' && <div className="studio-analytics-notice" role="status"><strong>لا بيانات كافية بعد.</strong> ستظهر المؤشرات بعد أول تسجيل أو نشاط تعلّم حقيقي.</div>}
      {data.dataState === 'low' && <div className="studio-analytics-notice" role="status"><strong>بيانات أولية.</strong> المؤشرات قابلة للتغير مع زيادة عدد المتعلّمين.</div>}
      <AnalyticsKpiTiles metrics={data.kpis} />
      <div className="studio-analytics-grid">
        <AnalyticsLineChart title="التسجيلات اليومية" series={data.enrollmentsByDay} tone="blue" />
        <AnalyticsLineChart title="المتعلّمون النشطون يوميًا" series={data.activeLearnersByDay} tone="gold" />
        <AnalyticsBars title="قمع الإكمال" items={funnelItems} valueSuffix="٪" tone="blue" />
        <LessonHeatStrip lessons={data.lessonWatch} />
        <AnalyticsBars title="توزيع درجات الاختبارات" items={histogramItems} valueSuffix=" محاولة" tone="gold" />
        <section className="studio-analytics-chart" aria-labelledby="analytics-missed-title"><div className="studio-analytics-chart-head"><h2 id="analytics-missed-title">أكثر الأسئلة تفويتًا</h2><span>من المحاولات المسلّمة</span></div><AnalyticsDataTable headers={['السؤال', 'الإجابات الخاطئة', 'النسبة']} rows={missedRows} /></section>
        <section className="studio-analytics-chart" aria-labelledby="analytics-certificates-title"><div className="studio-analytics-chart-head"><h2 id="analytics-certificates-title">الشهادات والتقييمات</h2><span>مصادر حقيقية فقط</span></div><div className="studio-analytics-status-list"><p><strong>{number.format(data.certificates.count)}</strong> شهادة صادرة</p>{data.ratings.available ? <AnalyticsDataTable headers={['التقييم', 'العدد']} rows={data.ratings.distribution.map((item) => [item.label, number.format(item.count)])} /> : <p className="studio-analytics-unavailable">التقييمات غير متاحة: {data.ratings.reason}</p>}</div></section>
      </div>
    </PageTag>
  );
};

export default StudioAnalyticsPage;
