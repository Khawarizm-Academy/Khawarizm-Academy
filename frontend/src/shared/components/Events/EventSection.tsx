import React from 'react';
import { ArrowLeft, Calendar, Lightbulb, Radio } from 'lucide-react';
import type { EventItem } from '@/shared/types/entities';
import { EventArtwork } from '@/shared/components/Artwork/BrandVisuals';
import { toArabic } from '@/shared/lib/localization';

interface EventSectionProps {
  variant?: 'desktop' | 'mobile';
  featuredEvent: EventItem;
  workshopEvent?: EventItem;
  onExploreAgenda?: () => void;
}

export const EventSection: React.FC<EventSectionProps> = ({
  variant = 'desktop',
  featuredEvent,
  workshopEvent,
  onExploreAgenda,
}) => {
  if (variant === 'mobile') {
    return (
      <section className="event-card-mobile group">
        {/* Background Image / Laser Stage */}
        <div className="event-zoom">
          <EventArtwork type={featuredEvent.thumbnailType} />
        </div>

        {/* Gradient Overlay */}
        <div className="event-overlay-mobile">
          {/* Badge */}
          <div className="event-badge">{featuredEvent.badge}</div>

          {/* Title */}
          <h3 className="event-title-mobile">{featuredEvent.title}</h3>
        </div>
      </section>
    );
  }

  // Desktop Variant matching Figma Desktop Design
  return (
    <section className="event-section">
      {/* Section Header */}
      <div className="event-head flex-between">
        <div>
          <h2 className="event-head-title">الفعاليات والندوات</h2>
          <p className="event-head-sub">انضم إلى مجتمعنا في لقاءات علمية وتقنية تثري معرفتك.</p>
        </div>

        <button onClick={onExploreAgenda} className="btn-pill-subtle">
          {toArabic('actions', 'explore_agenda')}
        </button>
      </div>

      {/* Content Grid */}
      <div className="event-grid">
        {/* Right (Start in RTL, 7 cols): Featured Major Event Card */}
        <div className="event-feature group">
          <div className="event-zoom">
            <EventArtwork type={featuredEvent.thumbnailType} />
          </div>

          <div className="event-overlay">
            {/* Live Badge with Active Pulsing Radar Indicator */}
            <div className="event-live-badge">
              <span className="event-live-dot">
                <span className="event-live-ping" />
                <span className="event-live-core" />
              </span>
              <span>{featuredEvent.badge}</span>
            </div>

            {/* Title */}
            <h3 className="event-title">{featuredEvent.title}</h3>

            {/* Meta Row: Date & Broadcast */}
            <div className="event-meta">
              <span className="event-meta-item">
                <Calendar size={14} />
                {featuredEvent.date}
              </span>
              <span className="event-meta-item text-blue-400">
                <Radio size={14} />
                {featuredEvent.format}
              </span>
            </div>
          </div>
        </div>

        {/* Left (End in RTL, 5 cols): Secondary Academic Workshop Card */}
        {workshopEvent && (
          <div className="event-workshop">
            <div>
              {/* Lightbulb Icon in Warm Gold Container */}
              <div className="card-icon-box text-gold-400 mb-5">
                <Lightbulb size={22} />
              </div>

              <h4 className="event-workshop-title">{workshopEvent.title}</h4>

              <p className="event-workshop-desc">{workshopEvent.description}</p>
            </div>

            {/* Horizontal Border Line inside Workshop card */}
            <div className="event-workshop-foot flex-between">
              <span className="event-workshop-date">{workshopEvent.date}</span>
              <button className="link-action-blue font-semibold group py-1 px-2.5">
                <span>{toArabic('actions', 'register')}</span>
                <ArrowLeft size={14} className="arrow-shift" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
