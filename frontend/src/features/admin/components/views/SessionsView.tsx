import React from 'react';
import { MonitorSmartphone } from 'lucide-react';
import { SlidingSegmentedControl } from '@/shared/components/Controls/SlidingSegmentedControl';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminSearchBox } from '@/features/admin/components/controls/AdminSearchBox';
import { SessionsTable } from '@/features/admin/components/layout/SessionsTable';
import { AdminPagination } from '@/features/admin/components/toolbar/AdminPagination';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { ACTIVE_FILTERS } from '@/features/admin/types';

/** Sessions section: the whole fleet's devices, with a force-logout per row. */
export const SessionsView: React.FC = () => {
  const {
    sessions,
    loadErrors,
    refresh,
    sessionSearch,
    setSessionSearch,
    sessionActive,
    setSessionActive,
    setSessionPage,
    revokingSessionId,
    revokeSession,
  } = useAdmin();

  const isSearching = Boolean(sessionSearch) || sessionActive !== 'all';

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <AdminSearchBox
          value={sessionSearch}
          onChange={setSessionSearch}
          placeholder="ابحث بالبريد الإلكتروني أو عنوان IP…"
          label="بحث في الجلسات"
        />
        <SlidingSegmentedControl
          options={ACTIVE_FILTERS}
          value={sessionActive}
          onChange={setSessionActive}
          tone="blue"
          aria-label="تصفية حسب حالة الجلسة"
        />
      </div>

      {sessions && sessions.results.length > 0 ? (
        <>
          <SessionsTable rows={sessions.results} revokingSessionId={revokingSessionId} onRevoke={revokeSession} />
          <AdminPagination
            total={sessions.total}
            page={sessions.page}
            pageSize={sessions.pageSize}
            onPageChange={setSessionPage}
          />
        </>
      ) : (
        <AdminEmptyState
          icon={MonitorSmartphone}
          title={
            loadErrors.sessions
              ? 'تعذّر تحميل الجلسات'
              : isSearching
              ? 'لا توجد جلسات تطابق البحث'
              : 'لا توجد جلسات بعد'
          }
          hint={
            loadErrors.sessions
              ? 'تعذّر الوصول إلى الخادم؛ أعد المحاولة بعد لحظات.'
              : isSearching
              ? 'جرّب تعديل كلمة البحث أو اختيار حالة أخرى.'
              : 'تظهر الجلسات هنا فور دخول أي حساب من جهاز جديد.'
          }
          isError={loadErrors.sessions}
          onRetry={refresh}
        />
      )}
    </div>
  );
};
