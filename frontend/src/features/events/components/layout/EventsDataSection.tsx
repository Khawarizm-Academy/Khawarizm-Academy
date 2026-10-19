import React from 'react';
import { CalendarX, CircleAlert } from 'lucide-react';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { StatePanel } from '@/shared/components/State/StatePanel';
import { fetchEvents } from '@/features/events/data/eventFetchers';
import { FeaturedEventCard } from '@/features/events/components/cards/FeaturedEventCard';
import { EventCard } from '@/features/events/components/cards/EventCard';
import type { EventItem } from '@/shared/types/entities';

/** The only part that re-renders on data change; the hero stays stable. */
export const EventsDataSection: React.FC = () => {
  const { data, isLoading, isError, refetch } = useCachedData<EventItem[]>(['events-list'], fetchEvents, {
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    initialData: [],
  });

  if (isError) {
    return (
      <StatePanel
        tone="danger"
        icon={<CircleAlert size={30} />}
        title="تعذّر تحميل الفعاليات"
        text="حدث خطأ أثناء جلب الفعاليات. حاول مرة أخرى بعد لحظات."
        action={
          <button type="button" onClick={() => refetch()} className="btn-outline-blue text-xs mt-2">
            إعادة المحاولة
          </button>
        }
      />
    );
  }

  if (isLoading) {
    return <DataSectionSkeleton variant="grid" count={6} />;
  }

  if (data.length === 0) {
    return (
      <StatePanel
        icon={<CalendarX size={30} />}
        title="لا توجد فعاليات قادمة حالياً"
        text="نعمل على تجهيز فعاليات وورش عمل جديدة. عُد قريباً لاستكشافها."
      />
    );
  }

  // The featured flag leads the page; otherwise the first event does.
  const featured = data.find((event) => event.isFeatured) ?? data[0];
  const rest = data.filter((event) => event.id !== featured.id);

  return (
    <div className="events-data">
      <section className="events-section">
        <h2 className="events-section-title section-accent-title-blue">
          <span>الحدث المميز</span>
        </h2>
        <FeaturedEventCard event={featured} />
      </section>

      {rest.length > 0 && (
        <section className="events-section">
          <h2 className="events-section-title section-accent-title-gold">
            <span>جميع الفعاليات</span>
          </h2>
          <div className="events-grid">
            {rest.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
