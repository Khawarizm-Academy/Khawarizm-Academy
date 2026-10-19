import React from 'react';
import { Calendar, Radio } from 'lucide-react';
import { EventArtwork } from '@/shared/components/Artwork/BrandVisuals';
import type { EventItem } from '@/shared/types/entities';

interface EventCardProps {
  event: EventItem;
}

/** One event in the grid: artwork, badge, title, description, date and format. */
export const EventCard: React.FC<EventCardProps> = ({ event }) => (
  <article className="card-interactive-blue event-card group">
    <div className="event-card-media">
      <div className="event-zoom">
        <EventArtwork type={event.thumbnailType} />
      </div>
      <span className="badge-blue event-card-badge">{event.badge}</span>
    </div>

    <div className="event-card-body">
      <h3 className="card-title-lg">{event.title}</h3>
      {event.description && <p className="event-card-desc">{event.description}</p>}

      <div className="card-meta-row">
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
