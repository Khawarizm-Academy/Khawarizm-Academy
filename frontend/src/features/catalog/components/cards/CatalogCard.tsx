import React from 'react';
import { Award, Play, Star } from 'lucide-react';
import type { CatalogItem } from '@/shared/mocks/catalog';

interface CatalogCardProps {
  item: CatalogItem;
  index?: number;
  onSelect?: (item: CatalogItem) => void;
  onPrefetch?: () => void;
}

/** Per pillar: accent, strip and meta line — courses read cyan, scholarships read gold. */
const pillarStyle = (item: CatalogItem) =>
  ({
    course: {
      accent: 'text-blue-400',
      strip: 'card-accent-blue',
      meta: `${item.instructor} • ${item.duration} • ${item.lessonsCount} درسًا`,
    },
    scholarship: {
      accent: 'text-gold-400',
      strip: 'card-accent-gold',
      meta: `${item.provider} • ${item.country} • ${item.degreeLabel}`,
    },
  }[item.type]);

/** Deadline badge accent per urgency; a critical deadline pulses. */
const DEADLINE_ACCENT: Record<'critical' | 'warning' | 'normal', string> = {
  critical: 'border-danger-500 text-danger-500 animate-pulse',
  warning: 'border-gold-400 text-gold-400',
  normal: 'border-blue-400/50 text-slate-400',
};

export const CatalogCard: React.FC<CatalogCardProps> = ({ item, index = 0, onSelect, onPrefetch }) => {
  const isCourse = item.type === 'course';
  const pillar = pillarStyle(item);

  return (
    <article
      onClick={() => onSelect?.(item)}
      onMouseEnter={onPrefetch}
      /* card-interactive-* supplies the whole shell; group enables the accent hovers;
         cards cascade in with a short stagger so filtered results feel alive */
      className={`group animate-pop-in ${isCourse ? 'card-interactive-blue' : 'card-interactive-gold'}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Thumbnail */}
      <div className="catalog-card-media">
        <img src={item.thumbnailUrl} alt={item.title} className="catalog-card-thumb" loading="lazy" />
        <div className="catalog-card-media-shade" />

        {/* Center icon: Play for courses, Award for scholarships */}
        <div className="catalog-card-symbol">
          {isCourse ? (
            <Play size={20} className="text-blue-400 translate-x-[-1px] fill-blue-400" />
          ) : (
            <Award size={20} className="text-gold-400" />
          )}
        </div>

        {/* Top-right badge (RTL: visual start) */}
        {isCourse && item.progressBadge && (
          <div className="catalog-card-badge border-blue-400/50 text-blue-400">
            {item.progressBadge}
          </div>
        )}

        {!isCourse && item.deadlineBadge && (
          <div className={`catalog-card-badge ${DEADLINE_ACCENT[item.deadlineUrgency ?? 'normal']}`}>
            {item.deadlineBadge}
          </div>
        )}

        {/* Bottom glowing accent strip */}
        <div className={pillar.strip} />
      </div>

      {/* Card body */}
      <div className="catalog-card-body sm:p-5">
        {/* Header: category right, rating or country left */}
        <div className="flex-between">
          <span className={`catalog-card-category ${pillar.accent}`}>{item.category}</span>

          {isCourse ? (
            <div className="flex items-center gap-1 text-xs text-gold-400 font-semibold">
              <span className="tabular-nums">{item.rating?.toFixed(1)}</span>
              <Star size={12} className="fill-gold-400" />
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-body truncate max-w-[140px]">
              {item.country}
            </span>
          )}
        </div>

        <h3 className="catalog-card-title">{item.title}</h3>

        <p className="catalog-card-meta">{pillar.meta}</p>

        <div className="catalog-card-divider" />

        {/* Footer: level or coverage badge, price or degree */}
        <div className="catalog-card-footer">
          {isCourse ? (
            <>
              <span className="badge-blue">{item.courseLevelAr || 'مبتدئ'}</span>
              <span className="text-sm font-bold text-white font-display">
                {item.priceLabel || 'مجانية'}
              </span>
            </>
          ) : (
            <>
              <span className="badge-gold-subtle">{item.coverageLabel || 'تمويل كامل'}</span>
              <span className="text-xs sm:text-sm font-bold text-gold-400 font-display">
                {item.degreeLabel || 'بكالوريوس'}
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
