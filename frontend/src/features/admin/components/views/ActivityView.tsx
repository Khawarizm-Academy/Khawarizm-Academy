import React from 'react';
import { SlidingSegmentedControl } from '@/shared/components/Controls/SlidingSegmentedControl';
import { History } from 'lucide-react';
import { useAdmin } from '@/features/admin/context/adminContext';
import { EventList } from '@/features/admin/components/layout/EventList';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { EVENT_KIND_FILTERS } from '@/features/admin/types';

/** Activity section: the most recent audit rows across the whole platform. */
export const ActivityView: React.FC = () => {
  const { events, eventKind, setEventKind, loadErrors, refresh } = useAdmin();

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <SlidingSegmentedControl
          options={EVENT_KIND_FILTERS}
          value={eventKind}
          onChange={setEventKind}
          tone="gold"
          aria-label="تصفية حسب نوع الحدث"
        />
      </div>

      {events.length > 0 ? (
        <EventList events={events} />
      ) : (
        <AdminEmptyState
          icon={History}
          title={loadErrors.activity ? 'تعذّر تحميل سجل النشاط' : 'لا توجد أحداث بعد'}
          hint={
            loadErrors.activity
              ? 'تعذّر الوصول إلى الخادم؛ أعد المحاولة بعد لحظات.'
              : 'تسجّل أحداث الدخول والخروج والإبطال هنا فور وقوعها.'
          }
          isError={loadErrors.activity}
          onRetry={refresh}
        />
      )}
    </div>
  );
};
