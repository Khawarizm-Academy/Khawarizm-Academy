import React from 'react';
import { EventKindBadge } from '@/features/admin/components/cards/Badges';
import { DEVICE_LABELS, EVENT_KIND_LABELS, type AdminEvent, type AdminUserEvent } from '@/features/admin/types';
import { formatDateTime } from '@/features/admin/data/adminFormatters';

interface EventListProps {
  /** A global row carries an email; a user's own row omits it (the profile shows it). */
  events: Array<AdminEvent | AdminUserEvent>;
}

/** Audit feed shared by the activity section and the user detail panel. */
export const EventList: React.FC<EventListProps> = ({ events }) => (
  <div className="admin-feed">
    {events.map((event) => (
      <article key={event.id} className="admin-event">
        <EventKindBadge kind={event.kind} />
        <div className="admin-event-main">
          {'email' in event && <span className="admin-event-email">{event.email}</span>}
          <span className="admin-event-detail">{event.detail || EVENT_KIND_LABELS[event.kind]}</span>
          <span className="admin-event-meta">
            {event.os} · {event.browser} · {DEVICE_LABELS[event.deviceType] ?? event.deviceType}
            {event.ipAddress && ` · ${event.ipAddress}`}
          </span>
        </div>
        <time className="admin-event-time" dateTime={event.createdAt}>
          {formatDateTime(event.createdAt)}
        </time>
      </article>
    ))}
  </div>
);
