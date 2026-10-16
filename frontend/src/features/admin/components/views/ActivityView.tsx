import React from 'react';
import { SlidingSegmentedControl } from '@/shared/components/Controls/SlidingSegmentedControl';
import { useAdmin } from '@/features/admin/context/adminContext';
import { EventList } from '@/features/admin/components/layout/EventList';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { EVENT_KIND_LABELS, type AdminEventKind } from '@/features/admin/types';

const KIND_ORDER: AdminEventKind[] = ['login', 'logout', 'refresh', 'revoked', 'rejected'];

/** One filter row: "all" first, then every kind in the order the API records them. */
const KIND_FILTERS: Array<{ id: AdminEventKind | 'all'; label: string }> = [
  { id: 'all', label: 'الكل' },
  ...KIND_ORDER.map((kind) => ({ id: kind, label: EVENT_KIND_LABELS[kind] })),
];

/** Activity section: the most recent audit rows across the whole platform. */
export const ActivityView: React.FC = () => {
  const { events, eventKind, setEventKind, loadErrors, refresh } = useAdmin();

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <h2 className="admin-section-title">أحدث الأحداث</h2>
        <SlidingSegmentedControl
          options={KIND_FILTERS}
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
          title={loadErrors.activity ? 'تعذّر تحميل سجل النشاط' : 'لا توجد أحداث بعد'}
          hint={loadErrors.activity ? undefined : 'ستظهر أحداث المصادقة هنا فور حدوثها.'}
          isError={loadErrors.activity}
          onRetry={refresh}
        />
      )}
    </div>
  );
};
