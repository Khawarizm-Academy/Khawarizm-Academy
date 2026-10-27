import React from 'react';
import { ChartColumn, MonitorCheck } from 'lucide-react';
import { SlidingSegmentedControl } from '@/shared/components/Controls/SlidingSegmentedControl';
import { useAdmin } from '@/features/admin/context/adminContext';
import { LoginSeriesChart } from '@/features/admin/components/cards/LoginSeriesChart';
import { DeviceBreakdownLists } from '@/features/admin/components/cards/DeviceBreakdownLists';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { LOGIN_RANGES } from '@/features/admin/types';

/** Analytics section: daily logins plus the fleet's OS / browser / device shares. */
export const AnalyticsView: React.FC = () => {
  const { loginSeries, loginRange, setLoginRange, devices, loadErrors, refresh } = useAdmin();

  return (
    <div className="admin-view">
      <section className="admin-view-section">
        <div className="admin-section-head">
          <h2 className="admin-section-title">
            <ChartColumn size={15} className="admin-section-title-icon" />
            <span className="admin-section-title-text">تسجيلات الدخول اليومية</span>
          </h2>
          <SlidingSegmentedControl
            options={LOGIN_RANGES}
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
            icon={ChartColumn}
            title={loadErrors.analytics ? 'تعذّر تحميل التحليلات' : 'لا توجد تسجيلات دخول بعد'}
            hint={
              loadErrors.analytics
                ? 'تعذّر الوصول إلى الخادم؛ أعد المحاولة بعد لحظات.'
                : 'ستُرسم السلسلة اليومية هنا بعد أول تسجيل دخول.'
            }
            isError={loadErrors.analytics}
            onRetry={refresh}
          />
        )}
      </section>

      <section className="admin-view-section">
        <h2 className="admin-section-title">
          <MonitorCheck size={15} className="admin-section-title-icon" />
          <span className="admin-section-title-text">توزيع أجهزة الجمهور</span>
        </h2>
        {devices ? (
          <DeviceBreakdownLists breakdown={devices} />
        ) : (
          <AdminEmptyState
            icon={MonitorCheck}
            title={loadErrors.analytics ? 'تعذّر تحميل توزيع الأجهزة' : 'لا توجد بيانات أجهزة بعد'}
            isError={loadErrors.analytics}
            onRetry={refresh}
          />
        )}
      </section>
    </div>
  );
};
