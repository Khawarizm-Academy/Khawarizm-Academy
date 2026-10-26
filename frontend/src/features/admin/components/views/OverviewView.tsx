import React from 'react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useAdmin } from '@/features/admin/context/adminContext';
import { OverviewStatsGrid, type StatDescriptor } from '@/features/admin/components/cards/StatCard';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';

/** One health chip of the overview strip, straight from the diagnostics summary. */
const SUMMARY_CHIPS: { key: 'pipeline' | 'telegram' | 'google_drive'; label: string; okNote: string; failNote: string }[] = [
  { key: 'pipeline', label: 'خط التغليف', okNote: 'FFmpeg متوفر', failNote: 'FFmpeg غير متوفر' },
  { key: 'telegram', label: 'تليجرام', okNote: 'جاهز للاختيار', failNote: 'غير جاهز — راجع الفحص' },
  { key: 'google_drive', label: 'Google Drive', okNote: 'جاهز للاختيار', failNote: 'غير جاهز — راجع الفحص' },
];

/** One verdict chip for the strip (label + tone + one-line state). */
const HealthChipRow: React.FC<{ label: string; detail: string; ok: boolean }> = ({ label, detail, ok }) => (
  <div className={`admin-health-chip ${ok ? 'admin-health-ok' : 'admin-health-error'}`}>
    <span className="admin-health-chip-icon">
      {ok ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
    </span>
    <span className="admin-health-chip-text">
      <span className="admin-health-chip-name">{label}</span>
      <span className="admin-health-chip-detail">{detail}</span>
    </span>
  </div>
);

/** Console home: three counter rows — users, sessions, auth activity — plus the video health strip. */
export const OverviewView: React.FC = () => {
  const { overview, loadErrors, refresh, videoDiagnostics, selectSection } = useAdmin();

  if (!overview) {
    return (
      <AdminEmptyState
        title={loadErrors.overview ? 'تعذّر تحميل النظرة العامة' : 'لا توجد بيانات بعد'}
        hint={loadErrors.overview ? 'تعذّر الوصول إلى الخادم.' : 'ستظهر الأرقام هنا بعد أول نشاط على المنصة.'}
        isError={loadErrors.overview}
        onRetry={refresh}
      />
    );
  }

  const userStats: StatDescriptor[] = [
    { metric: 'total', label: 'إجمالي المستخدمين', value: overview.users.total, tone: 'sky' },
    { metric: 'students', label: 'الطلاب', value: overview.users.students, tone: 'sky' },
    { metric: 'instructors', label: 'المدرّبون', value: overview.users.instructors, tone: 'gold' },
    { metric: 'admins', label: 'المشرفون', value: overview.users.admins, tone: 'gold' },
    { metric: 'newLast7Days', label: 'جدد هذا الأسبوع', value: overview.users.newLast7Days, tone: 'emerald' },
  ];

  const sessionStats: StatDescriptor[] = [
    { metric: 'active', label: 'جلسات نشطة الآن', value: overview.sessions.active, tone: 'emerald' },
    { metric: 'sessionsTotal', label: 'كل الجلسات', value: overview.sessions.total, tone: 'sky' },
  ];

  const activityStats: StatDescriptor[] = [
    { metric: 'loginsLast24h', label: 'دخول آخر ٢٤ ساعة', value: overview.activity.loginsLast24h, tone: 'sky' },
    { metric: 'loginsLast7d', label: 'دخول آخر ٧ أيام', value: overview.activity.loginsLast7d, tone: 'sky' },
    { metric: 'revocationsLast7d', label: 'جلسات مُنهَت', value: overview.activity.revocationsLast7d, tone: 'gold' },
    { metric: 'rejectedLast7d', label: 'محاولات مرفوضة', value: overview.activity.rejectedLast7d, tone: 'danger' },
  ];

  const contentStats: StatDescriptor[] = [
    { metric: 'courses', label: 'الدورات', value: overview.content.courses, tone: 'sky' },
    { metric: 'scholarships', label: 'المنح', value: overview.content.scholarships, tone: 'gold' },
    { metric: 'events', label: 'الفعاليات', value: overview.content.events, tone: 'emerald' },
    { metric: 'competitions', label: 'المسابقات', value: overview.content.competitions, tone: 'gold' },
  ];

  const providerReason = (code: string): string =>
    videoDiagnostics?.providers.find((provider) => provider.code === code)?.reason ?? 'غير مضبوط';

  return (
    <div className="admin-view">
      <section className="admin-view-section">
        <div className="admin-section-head">
          <h2 className="admin-section-title">حالة استضافة الفيديو</h2>
          <button type="button" className="admin-ghost-btn" onClick={() => selectSection('system')}>
            <span>الفحص الكامل</span>
            <ArrowLeft size={14} className="rotate-180" />
          </button>
        </div>
        <div className="admin-health-strip">
          {SUMMARY_CHIPS.map((chip) => {
            const ok = videoDiagnostics?.summary[chip.key];
            return (
              <HealthChipRow
                key={chip.key}
                label={chip.label}
                detail={ok === undefined ? 'لم يُفحص بعد' : ok ? chip.okNote : providerReason(chip.key) || chip.failNote}
                ok={ok === true}
              />
            );
          })}
        </div>
      </section>

      <section className="admin-view-section">
        <h2 className="admin-section-title">المستخدمون</h2>
        <OverviewStatsGrid stats={userStats} />
      </section>

      <section className="admin-view-section">
        <h2 className="admin-section-title">الأجهزة والجلسات</h2>
        <OverviewStatsGrid stats={sessionStats} />
      </section>

      <section className="admin-view-section">
        <h2 className="admin-section-title">نشاط المصادقة</h2>
        <OverviewStatsGrid stats={activityStats} />
      </section>

      <section className="admin-view-section">
        <h2 className="admin-section-title">المحتوى</h2>
        <OverviewStatsGrid stats={contentStats} />
      </section>
    </div>
  );
};
