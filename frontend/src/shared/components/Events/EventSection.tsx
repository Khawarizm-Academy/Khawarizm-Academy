import React from 'react';
import type { EventItem } from '../../types/entities';
import { EventArtwork } from '../Artwork/BrandVisuals';

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
      <section className="w-full relative overflow-hidden rounded-2xl border border-[#1B3F80] shadow-[0_4px_25px_rgba(0,0,0,0.5)] h-44 sm:h-48 group cursor-pointer">
        {/* Background Image / Laser Stage */}
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
          <EventArtwork type={featuredEvent.thumbnailType} />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040F24] via-[#040F24]/75 to-transparent p-6 flex flex-col justify-end items-start text-right z-10">
          {/* Badge */}
          <div className="mb-2 px-3 py-0.5 rounded-full bg-[#061A3A]/90 border border-[#29A9FF]/40 text-[#29A9FF] text-xs font-semibold font-['IBM_Plex_Sans_Arabic'] shadow-xs">
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
    <section className="w-full rounded-2xl bg-[#061A3A]/50 backdrop-blur-md border border-[#1B3F80]/80 p-8 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#1B3F80]">
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
          className="px-6 py-2 rounded-full bg-[#061A3A] hover:bg-[#092557] border border-[#1B3F80] hover:border-[#29A9FF]/50 text-[#DCE5EE] hover:text-white text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
        >
          استكشف الأجندة
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Right (Start in RTL, 7 cols): Featured Major Event Card */}
        <div className="lg:col-span-7 relative min-h-[300px] rounded-xl overflow-hidden border border-[#1B3F80] group shadow-[0_4px_25px_rgba(0,0,0,0.5)] cursor-pointer">
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
            <EventArtwork type={featuredEvent.thumbnailType} />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-[#040F24] via-[#040F24]/60 to-transparent p-6 sm:p-8 flex flex-col justify-end items-start text-right z-10">
            {/* Live Badge with Active Pulsing Radar Indicator */}
            <div className="mb-3 px-3 py-1 rounded-full bg-[#167BDB] text-white text-xs font-semibold font-['IBM_Plex_Sans_Arabic'] shadow-[0_0_12px_rgba(22,123,219,0.5)] flex items-center gap-2">
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                {featuredEvent.date}
              </span>
              <span className="flex items-center gap-1.5 text-[#29A9FF]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
                  <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
                  <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
                </svg>
                {featuredEvent.format}
              </span>
            </div>
          </div>
        </div>

        {/* Left (End in RTL, 5 cols): Secondary Academic Workshop Card */}
        {workshopEvent && (
          <div className="lg:col-span-5 bg-[#061A3A]/90 backdrop-blur-md rounded-xl border border-[#1B3F80] hover:border-[#29A9FF]/40 p-6 sm:p-7 flex flex-col justify-between text-right shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300">
            <div>
              {/* Lightbulb Icon in Warm Gold Container */}
              <div className="w-11 h-11 rounded-xl bg-[#E5B65C]/15 border border-[#E5B65C]/30 flex items-center justify-center text-[#E5B65C] mb-5 shadow-[0_0_12px_rgba(229,182,92,0.2)]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
              </div>

              <h4 className="text-xl font-bold text-white mb-2.5 font-['IBM_Plex_Sans_Arabic'] leading-snug">
                {workshopEvent.title}
              </h4>

              <p className="text-sm text-[#8299B5] font-['Tajawal'] leading-relaxed">
                {workshopEvent.description}
              </p>
            </div>

            {/* Horizontal Border Line inside Workshop card */}
            <div className="pt-4 mt-6 border-t border-[#1B3F80] flex items-center justify-between text-xs font-['Tajawal']">
              <span className="text-[#8299B5] font-medium">{workshopEvent.date}</span>
              <button className="text-[#29A9FF] hover:text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer group">
                <span>تسجيل</span>
                <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
