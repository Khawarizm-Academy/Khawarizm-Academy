import React from 'react';
import { ArrowLeft, BellRing, Clock, Globe, Landmark, MapPin } from 'lucide-react';
import type { Scholarship } from '@/shared/types/entities';
import { ScholarshipThumbnail } from '@/shared/components/Artwork/BrandVisuals';
import { convertKeyToAr, toArabic } from '@/shared/lib/localization';

interface ScholarshipCardProps {
  scholarship: Scholarship;
  layout?: 'desktop' | 'mobile';
  onApply?: (scholarship: Scholarship) => void;
}

export const ScholarshipCard: React.FC<ScholarshipCardProps> = ({
  scholarship,
  layout = 'desktop',
  onApply,
}) => {
  const isMobile = layout === 'mobile';

  if (isMobile) {
    return (
      <div className="group card-interactive-gold rail-card-size">
        <div>
          {/* Mobile Media Thumbnail */}
          <div className="card-media-box">
            <ScholarshipThumbnail type={scholarship.thumbnailType} />

            {/* Urgency Badge */}
            <div className="absolute top-2 right-2 badge-gold">
              <span>{scholarship.deadlineText}</span>
              {scholarship.deadlineUrgency === 'warning' && (
                <BellRing size={10} fill="currentColor" />
              )}
            </div>

            {/* 2px Gold Accent Bar at Bottom of Thumbnail that blooms softly on hover */}
            <div className="card-accent-gold" />
          </div>

          {/* Content Body */}
          <div className="p-4">
            <h4 className="card-title">{scholarship.title}</h4>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="card-meta-row mb-3">
            {/* Location with Pin */}
            <div className="flex items-center gap-1 text-slate-400">
              <MapPin size={14} />
              <span>{scholarship.location}</span>
            </div>

            {/* Coverage Tag */}
            <span className="card-coverage">
              {convertKeyToAr(scholarship.coverage, 'coverage')}
            </span>
          </div>

          {/* Action Button: Balanced and accessible */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply?.(scholarship);
            }}
            className="w-full btn-gold text-[13px]"
          >
            <span>{toArabic('actions', 'apply_now')}</span>
            <ArrowLeft size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Desktop Card Variant matching Figma Desktop Design
  return (
    <div className="group card-interactive-gold w-full h-full">
      {/* Top Accent Bar in Warm Gold matching Figma Layer 'Top Accent Bar' */}
      <div className="card-top-bar-gold" />

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Top Row: Icon + Urgency Badge */}
          <div className="flex-between mb-4">
            {/* Institution / Globe Icon in Rounded Box */}
            <div className="card-icon-box text-gold-400">
              {scholarship.iconType === 'globe' ? (
                <Globe size={22} />
              ) : (
                <Landmark size={22} />
              )}
            </div>

            {/* Urgency Badge */}
            <div className="badge-gold-subtle">
              <Clock size={12} />
              <span>{scholarship.deadlineText}</span>
            </div>
          </div>

          {/* Title */}
          <h4 className="card-title-lg">{scholarship.title}</h4>

          {/* Provider */}
          <p className="card-subtitle">{scholarship.provider}</p>
        </div>

        <div>
          {/* Badges / Tags */}
          <div className="flex items-center gap-2 mb-4 justify-start">
            {scholarship.degreeLevel && (
              <span className="tag-box text-slate-100">
                {convertKeyToAr(scholarship.degreeLevel, 'degreeLevels')}
              </span>
            )}
            <span className="tag-box text-gold-400 font-medium">
              {convertKeyToAr(scholarship.coverage, 'coverage')}
            </span>
          </div>

          {/* Primary Gold Rounded-Full Button: Balanced size */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply?.(scholarship);
            }}
            className="w-full btn-gold text-[13px] sm:text-sm"
          >
            <span>{toArabic('actions', 'apply_now')}</span>
            <ArrowLeft size={14} className="arrow-shift" />
          </button>
        </div>
      </div>
    </div>
  );
};
