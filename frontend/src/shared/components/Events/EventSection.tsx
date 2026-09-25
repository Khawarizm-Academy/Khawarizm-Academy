import React from 'react';
import { ArrowLeft, Calendar, Lightbulb, Radio } from 'lucide-react';
import type { EventItem } from '../../types/entities';
import { EventArtwork } from '../Artwork/BrandVisuals';
import { toArabic } from '../../lib/localization';

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
      <section className="w-full relative overflow-hidden rounded-2xl border border-[#1B3F80]/40 shadow-[0_4px_25px_rgba(0,0,0,0.35)] h-44 sm:h-48 group cursor-pointer backdrop-blur-md bg-[#061A3A]/40">
        {/* Background Image / Laser Stage */}
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
          <EventArtwork type={featuredEvent.thumbnailType} />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040F24] via-[#040F24]/70 to-transparent p-5 sm:p-6 flex flex-col justify-end items-start text-right z-10">
          {/* Badge */}
          <div className="mb-2 px-3 py-0.5 rounded-full bg-[#061A3A]/80 border border-[#29A9FF]/30 text-[#29A9FF] text-xs font-semibold font-['IBM_Plex_Sans_Arabic'] shadow-xs">
            {featuredEvent.badge}
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-[#29A9FF] font-['IBM_Plex_Sans_Arabic'] leading-tight transition-colors">
            {featuredEvent.title}
          </h3>
        </div>
      </section>
    );
  }

  // Desktop Variant matching Figma Desktop Design
  return (
    <section className="w-full rounded-2xl bg-[#061A3A]/30 backdrop-blur-md border border-[#1B3F80]/40 p-7 sm:p-9 shadow-[0_4px_30px_rgba(0,0,0,0.25)]">
      {/* Section Header */}
      <div className="flex-between mb-7 pb-4 border-b border-[#1B3F80]/40">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 font-['IBM_Plex_Sans_Arabic'] text-right tracking-tight">
            الفعاليات والندوات
          </h2>
          <p className="text-sm text-[#8299B5] font-['Tajawal'] text-right">
            انضم إلى مجتمعنا في لقاءات علمية وتقنية تثري معرفتك.
          </p>
        </div>

        <button
          onClick={onExploreAgenda}
          className="btn-pill-subtle"
        >
          {toArabic('actions', 'explore_agenda')}
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Right (Start in RTL, 7 cols): Featured Major Event Card */}
        <div className="lg:col-span-7 relative min-h-[300px] rounded-xl overflow-hidden border border-[#1B3F80]/50 group shadow-[0_4px_25px_rgba(0,0,0,0.35)] cursor-pointer">
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
            <EventArtwork type={featuredEvent.thumbnailType} />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-[#040F24] via-[#040F24]/55 to-transparent p-6 sm:p-8 flex flex-col justify-end items-start text-right z-10">
            {/* Live Badge with Active Pulsing Radar Indicator */}
            <div className="mb-3 px-3 py-1 rounded-full bg-[#167BDB] text-white text-xs font-semibold font-['IBM_Plex_Sans_Arabic'] shadow-[0_0_12px_rgba(22,123,219,0.4)] flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <span>{featuredEvent.badge}</span>
            </div>

            {/* Title */}
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 font-['IBM_Plex_Sans_Arabic'] leading-tight group-hover:text-[#29A9FF] transition-colors drop-shadow-md">
              {featuredEvent.title}
            </h3>

            {/* Meta Row: Date & Broadcast */}
            <div className="flex items-center gap-5 text-xs text-[#8299B5] font-['Tajawal']">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {featuredEvent.date}
              </span>
              <span className="flex items-center gap-1.5 text-[#29A9FF]">
                <Radio size={14} />
                {featuredEvent.format}
              </span>
            </div>
          </div>
        </div>

        {/* Left (End in RTL, 5 cols): Secondary Academic Workshop Card */}
        {workshopEvent && (
          <div className="lg:col-span-5 bg-[#061A3A]/40 backdrop-blur-md rounded-xl border border-[#1B3F80]/40 hover:border-[#29A9FF]/30 p-6 sm:p-7 flex flex-col justify-between text-right shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-all duration-300">
            <div>
              {/* Lightbulb Icon in Warm Gold Container */}
              <div className="card-icon-box text-[#E5B65C] mb-5">
                <Lightbulb size={22} />
              </div>

              <h4 className="text-xl font-bold text-white mb-2.5 font-['IBM_Plex_Sans_Arabic'] leading-snug">
                {workshopEvent.title}
              </h4>

              <p className="text-sm text-[#8299B5] font-['Tajawal'] leading-relaxed">
                {workshopEvent.description}
              </p>
            </div>

            {/* Horizontal Border Line inside Workshop card */}
            <div className="pt-4 mt-6 border-t border-[#1B3F80]/40 flex-between text-xs font-['Tajawal']">
              <span className="text-[#8299B5] font-medium">{workshopEvent.date}</span>
              <button className="link-action-blue font-semibold group py-1 px-2.5">
                <span>{toArabic('actions', 'register')}</span>
                <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-1" />
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
