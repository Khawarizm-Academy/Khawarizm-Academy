import React from 'react';
import type { Scholarship } from '../../types/entities';
import { ScholarshipThumbnail } from '../Artwork/BrandVisuals';
import { convertKeyToAr, toArabic } from '../../lib/localization';

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
      <div className="group card-interactive-gold w-64 sm:w-72 shrink-0 min-h-[295px]">
        <div>
          {/* Mobile Media Thumbnail */}
          <div className="card-media-box">
            <ScholarshipThumbnail type={scholarship.thumbnailType} />

            {/* Urgency Badge */}
            <div className="absolute top-2 right-2 badge-gold">
              <span>{scholarship.deadlineText}</span>
              {scholarship.deadlineUrgency === 'warning' && (
                <svg width="10" height="12" viewBox="0 0 8 10" fill="currentColor">
                  <path d="M2 9H6V7.5C6 6.95 5.8 6.5 5.4 6.1C5 5.7 4.55 5.5 4 5.5C3.45 5.5 3 5.7 2.6 6.1C2.2 6.5 2 6.95 2 7.5V9ZM4 4.5C4.55 4.5 5 4.3 5.4 3.9C5.8 3.5 6 3.05 6 2.5V1H2V2.5C2 3.05 2.2 3.5 2.6 3.9C3 4.3 3.45 4.5 4 4.5ZM0 10V9H1V7.5C1 7 1.1 6.5 1.35 6.05C1.6 5.6 1.9 5.25 2.35 5C1.9 4.75 1.6 4.4 1.35 3.95C1.1 3.5 1 3 1 2.5V1H0V0H8V1H7V2.5C7 3 6.9 3.5 6.65 3.95C6.4 4.4 6.1 4.75 5.65 5C6.1 5.25 6.4 5.6 6.65 6.05C6.9 6.5 7 7 7 7.5V9H8V10H0Z" />
                </svg>
              )}
            </div>

            {/* 2px Gold Accent Bar at Bottom of Thumbnail that blooms softly on hover */}
            <div className="card-accent-gold" />
          </div>

          {/* Content Body */}
          <div className="p-4">
            <h4 className="card-title">
              {scholarship.title}
            </h4>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="card-meta-row mb-3">
            {/* Location with Pin */}
            <div className="flex items-center gap-1 text-[#8299B5]">
              <svg width="12" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{scholarship.location}</span>
            </div>

            {/* Coverage Tag */}
            <span className="text-[#E5B65C] font-semibold text-xs drop-shadow-[0_0_8px_rgba(229,182,92,0.25)]">
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
            <span className="text-sm">←</span>
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
            <div className="card-icon-box text-[#E5B65C]">
              {scholarship.iconType === 'globe' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                  <path d="M9 10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11H9Z" />
                </svg>
              )}
            </div>

            {/* Urgency Badge */}
            <div className="badge-gold-subtle">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{scholarship.deadlineText}</span>
            </div>
          </div>

          {/* Title */}
          <h4 className="card-title-lg">
            {scholarship.title}
          </h4>

          {/* Provider */}
          <p className="card-subtitle">
            {scholarship.provider}
          </p>
        </div>

        <div>
          {/* Badges / Tags */}
          <div className="flex items-center gap-2 mb-4 justify-start">
            {scholarship.degreeLevel && (
              <span className="tag-box text-[#DCE5EE]">
                {convertKeyToAr(scholarship.degreeLevel, 'degreeLevels')}
              </span>
            )}
            <span className="tag-box text-[#E5B65C] font-medium">
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
            <span className="text-sm transition-transform duration-200 group-hover:-translate-x-1">←</span>
          </button>
        </div>
      </div>
    </div>
  );
};
