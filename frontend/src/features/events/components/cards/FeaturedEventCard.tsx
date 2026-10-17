import React from 'react';
import { Calendar, Radio } from 'lucide-react';
import { EventArtwork } from '@/shared/components/Artwork/BrandVisuals';
import type { EventItem } from '@/shared/types/entities';

interface FeaturedEventCardProps {
  event: EventItem;
}

/** The featured event, drawn with the shared EventSection overlay treatment. */
export const FeaturedEventCard: React.FC<FeaturedEventCardProps> = ({ event }) => (
  <article className="event-feature group cursor-default">
    <div className="event-zoom">
      <EventArtwork type={event.thumbnailType} />
    </div>

    <div className="event-overlay">
      <div className="event-live-badge">
        <span className="event-live-dot">
          <span className="event-live-ping" />
          <span className="event-live-core" />
        </span>
        <span>{event.badge}</span>
      </div>

      <h3 className="event-title">{event.title}</h3>

      {event.description && <p className="event-feature-desc">{event.description}</p>}

      <div className="event-meta">
        <span className="event-meta-item">
          <Calendar size={14} />
          {event.date}
        </span>
        <span className="event-meta-item text-blue-400">
          <Radio size={14} />
          {event.format}
        </span>
      </div>
    </div>
  </article>
);
