import React from 'react';
import { CalendarDays } from 'lucide-react';

/** Events page header: pillar badge, title, and the one-line purpose. */
export const EventsHero: React.FC = () => (
  <header className="events-hero animate-fade-in-up">
    <span className="badge-blue">
      <CalendarDays size={13} />
      فعاليات وندوات علمية
    </span>
    <h1 className="events-hero-title">الفعاليات والندوات</h1>
    <p className="events-hero-subtitle">
      انضم إلى مجتمع خوارزم في لقاءات علمية وتقنية مباشرة، ومؤتمرات وورش عمل متخصصة تثري مسارك الأكاديمي.
    </p>
  </header>
);
