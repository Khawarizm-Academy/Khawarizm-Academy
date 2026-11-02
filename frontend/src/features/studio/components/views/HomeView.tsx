import React from 'react';
import { Activity, BookOpen, ChartNoAxesCombined, Inbox, Users } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { can } from '@/shared/lib/permissions';
import { CelestialCanvas } from '@/shared/components/Artwork/CelestialCanvas';
import { SectionHeading } from '@/shared/components/Workspace/SectionHeading';
import { KpiTile } from '@/features/studio/components/cards/KpiTile';
import { ReadinessRing } from '@/features/studio/components/cards/ReadinessRing';
import { StudioSkeleton } from '@/features/studio/components/states/StudioSkeleton';
import { StudioEmpty } from '@/features/studio/components/states/StudioEmpty';
import { OnboardingChecklist } from '@/features/studio/components/views/OnboardingChecklist';
import { useStudio } from '@/features/studio/context/studioContext';

export const HomeView: React.FC = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const { overview, isLoading, isError } = useStudio();
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'مدرّب';
  if (isLoading) return <StudioSkeleton />;
  if (isError || !overview) return <StudioEmpty title="تعذّر رصد الاستوديو" text="أعد المحاولة عندما يتاح الاتصال بالخادم." />;
  const totalCourses = Object.values(overview.courses).reduce((sum, value) => sum + value, 0);
  return (
    <div className="studio-home">
      <section className="studio-hero">
        <CelestialCanvas />
        <div>
          <span className="studio-kicker">Observatory · Workshop</span>
          <h1>مرحبًا، {firstName}</h1>
          <p>ورشة صناعة المعرفة تحت سماء المرصد.</p>
        </div>
        <ReadinessRing value={overview.readiness} size={112} label="جاهزية عامة" />
      </section>
      <div className="studio-kpis">
        <KpiTile label="دوراتك" value={totalCourses} icon={BookOpen} />
        <KpiTile label="المتعلّمون" value={overview.enrollments} icon={Users} tone="gold" />
        <KpiTile label="قيد المراجعة" value={overview.inReview} icon={Inbox} tone="neutral" />
        {can(user, 'analytics.view_own') && <KpiTile label="الجاهزية" value={`${overview.readiness}%`} icon={ChartNoAxesCombined} />}
      </div>
      {totalCourses === 0 ? <OnboardingChecklist /> : (
        <div className="studio-home-grid">
          {can(user, 'students.view_own') && (
            <section className="studio-panel">
              <SectionHeading title="تابع التحرير" />
              <div className="studio-activity-list">
                {overview.recentActivity.slice(0, 4).map((item) => (
                  <button type="button" className="studio-activity-row" key={`${item.courseSlug}-${item.at}`} onClick={() => item.courseSlug && nav(`/studio/courses/${item.courseSlug}?tab=info`)}>
                    <Activity size={16} /><span>{item.title}</span><small>{item.courseSlug}</small>
                  </button>
                ))}
              </div>
            </section>
          )}
          {can(user, 'analytics.view_own') && (
            <section className="studio-panel">
              <SectionHeading title="أداء آخر ٣٠ يومًا" />
              <div className="studio-series" aria-label="التسجيلات خلال 30 يومًا">
                {overview.series.slice(-14).map((point) => <span key={point.date} style={{ height: `${Math.max(8, Math.min(100, point.enrollments * 16 + 8))}%` }} title={`${point.date}: ${point.enrollments}`} />)}
              </div>
              <p className="studio-panel-note">التسجيلات الفعلية من بيانات الالتحاق.</p>
            </section>
          )}
          {overview.inbox.length > 0 && <section className="studio-panel"><SectionHeading title="بانتظارك" />{overview.inbox.map((item, index) => <button type="button" className="studio-inbox-item" key={`${item.kind}-${index}`} disabled={!item.courseSlug} onClick={() => item.courseSlug && nav(`/studio/courses/${item.courseSlug}?tab=publish`)}><Inbox size={16} /><span>{item.title}{item.note && <small>{item.note}</small>}</span></button>)}</section>}
        </div>
      )}
    </div>
  );
};
