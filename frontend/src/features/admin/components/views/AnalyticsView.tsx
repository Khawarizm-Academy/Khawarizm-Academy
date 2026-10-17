import React from 'react';
import { SlidingSegmentedControl } from '@/shared/components/Controls/SlidingSegmentedControl';
import { useAdmin } from '@/features/admin/context/adminContext';
import { LoginSeriesChart } from '@/features/admin/components/cards/LoginSeriesChart';
import { DeviceBreakdownLists } from '@/features/admin/components/cards/DeviceBreakdownLists';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import type { AdminLoginRange } from '@/features/admin/types';

const RANGES: Array<{ id: AdminLoginRange; label: string }> = [
  { id: '7', label: '٧ أيام' },
  { id: '14', label: '١٤ يومًا' },
  { id: '30', label: '٣٠ يومًا' },
];

/** Analytics section: daily logins plus the fleet's OS / browser / device shares. */
export const AnalyticsView: React.FC = () => {
  const { loginSeries, loginRange, setLoginRange, devices, loadErrors, refresh } = useAdmin();

  return (
    <div className="admin-view">
      <section className="admin-view-section">
        <div className="admin-section-head">
          <h2 className="admin-section-title">تسجيلات الدخول اليومية</h2>
          <SlidingSegmentedControl
            options={RANGES}
            value={loginRange}
            onChange={setLoginRange}
            tone="gold"
            aria-label="المدة الزمنية"
          />
        </div>

        {loginSeries && loginSeries.points.length > 0 ? (
          <LoginSeriesChart series={loginSeries} />
        ) : (
          <AdminEmptyState
            title={loadErrors.analytics ? 'تعذّر تحميل التحليلات' : 'لا توجد تسجيلات دخول بعد'}
            hint="ستظهر المنحنى اليومي هنا بعد أول تسجيل دخول."
            isError={loadErrors.analytics}
            onRetry={refresh}
          />
        )}
      </section>

      <section className="admin-view-section">
        <h2 className="admin-section-title">توزيع الأجهزة</h2>
        {devices ? (
          <DeviceBreakdownLists breakdown={devices} />
        ) : (
          <AdminEmptyState
            title={loadErrors.analytics ? 'تعذّر تحميل التوزيع' : 'لا توجد بيانات أجهزة بعد'}
            isError={loadErrors.analytics}
            onRetry={refresh}
          />
        )}
      </section>
    </div>
  );
};
