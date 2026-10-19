import React from 'react';
import { EventsHero } from '@/features/events/components/hero/EventsHero';
import { EventsDataSection } from '@/features/events/components/layout/EventsDataSection';

/** Events page — hero plus the cached events data section. */
export const EventsPage: React.FC = () => (
  <main className="content-container">
    <EventsHero />
    <EventsDataSection />
  </main>
);
