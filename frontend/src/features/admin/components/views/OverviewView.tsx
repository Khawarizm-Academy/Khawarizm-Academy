import React from 'react';
import { useAdmin } from '@/features/admin/context/adminContext';
import { OverviewStatsGrid, type StatDescriptor } from '@/features/admin/components/cards/StatCard';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';

/** Console home: three counter rows — users, sessions, auth activity. */
export const OverviewView: React.FC = () => {
  const { overview, loadErrors, refresh } = useAdmin();

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

  return (
    <div className="admin-view">
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
    </div>
  );
};
