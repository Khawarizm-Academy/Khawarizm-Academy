import React from 'react';
import { Award, Play, Star } from 'lucide-react';
import type { CatalogItem } from '../../../mocks/catalog';

interface CatalogCardProps {
  item: CatalogItem;
  onSelect?: (item: CatalogItem) => void;
  onPrefetch?: () => void;
}

export const CatalogCard: React.FC<CatalogCardProps> = ({ item, onSelect, onPrefetch }) => {
  const isCourse = item.type === 'course';

  return (
    <article
      onClick={() => onSelect?.(item)}
      onMouseEnter={onPrefetch}
      className={`group cursor-pointer rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-300 ${
        isCourse ? 'card-interactive-blue' : 'card-interactive-gold'
      }`}
    >
      {/* 1. Thumbnail Area */}
      <div className="relative w-full h-36 bg-[#040F24] overflow-hidden flex items-center justify-center">
        {/* Background Image with Tint */}
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:scale-105 group-hover:opacity-45 transition-all duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061A3A] via-transparent to-[#040F24]/40" />

        {/* Center Icon Symbol (Play for Course, Award for Scholarship) */}
        <div className="relative z-10 w-11 h-11 rounded-full bg-[#040F24]/85 border border-[#1B3F80] group-hover:border-[#29A9FF]/60 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
          {isCourse ? (
            <Play size={20} className="text-[#29A9FF] translate-x-[-1px] fill-[#29A9FF]" />
          ) : (
            <Award size={20} className="text-[#E5B65C]" />
          )}
        </div>

        {/* Top-Right Corner Badge (In RTL = Visual Right/Start) */}
        {isCourse && item.progressBadge && (
          <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-[#040F24]/90 border border-[#29A9FF]/50 text-[#29A9FF] text-[11px] font-['IBM_Plex_Sans_Arabic'] font-semibold shadow-md">
            {item.progressBadge}
          </div>
        )}

        {!isCourse && item.deadlineBadge && (
          <div
            className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-[#040F24]/90 text-[11px] font-['IBM_Plex_Sans_Arabic'] font-semibold shadow-md border ${
              item.deadlineUrgency === 'critical'
                ? 'border-[#D9534F] text-[#D9534F] animate-pulse'
                : item.deadlineUrgency === 'warning'
                ? 'border-[#E5B65C] text-[#E5B65C]'
                : 'border-[#29A9FF]/50 text-[#8299B5]'
            }`}
          >
            {item.deadlineBadge}
          </div>
        )}

        {/* Bottom Glowing Accent Strip */}
        {isCourse ? <div className="card-accent-blue" /> : <div className="card-accent-gold" />}
      </div>

      {/* 2. Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        {/* Header Row: Category on Right, Rating or Country on Left */}
        <div className="flex-between">
          <span
            className={`text-xs font-medium font-['Tajawal'] ${
              isCourse ? 'text-[#29A9FF]' : 'text-[#E5B65C]'
            }`}
          >
            {item.category}
          </span>

          {isCourse ? (
            <div className="flex items-center gap-1 text-xs text-[#E5B65C] font-semibold">
              <span className="tabular-nums">{item.rating?.toFixed(1)}</span>
              <Star size={12} className="fill-[#E5B65C]" />
            </div>
          ) : (
            <span className="text-xs text-[#8299B5] font-['Tajawal'] truncate max-w-[140px]">
              {item.country}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white font-['IBM_Plex_Sans_Arabic'] leading-snug line-clamp-2 group-hover:text-[#E5B65C] transition-colors">
          {item.title}
        </h3>

        {/* Subtitle / Meta */}
        <p className="text-xs text-[#8299B5] font-['Tajawal'] line-clamp-1">
          {isCourse
            ? `${item.instructor} • ${item.duration} • ${item.lessonsCount} درسًا`
            : `${item.provider} • ${item.country} • ${item.degreeLabel}`}
        </p>

        {/* Subtle Horizontal Divider */}
        <div className="w-full h-px bg-[#1B3F80]/50 my-0.5" />

        {/* Footer Row */}
        <div className="flex-between pt-1">
          {isCourse ? (
            <>
              <span className="badge-blue text-[11px] py-0.5 px-2">
                {item.courseLevelAr || 'مبتدئ'}
              </span>
              <span className="text-sm font-bold text-white font-['IBM_Plex_Sans_Arabic']">
                {item.priceLabel || 'مجانية'}
              </span>
            </>
          ) : (
            <>
              <span className="badge-gold-subtle text-[11px] py-0.5 px-2">
                {item.coverageLabel || 'تمويل كامل'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#E5B65C] font-['IBM_Plex_Sans_Arabic']">
                {item.degreeLabel || 'بكالوريوس'}
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
