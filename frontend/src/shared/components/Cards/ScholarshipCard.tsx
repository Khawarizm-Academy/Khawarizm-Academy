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
      <div className="group w-64 sm:w-72 shrink-0 min-h-[295px] bg-[#061A3A]/40 backdrop-blur-md rounded-xl border border-[#1B3F80]/40 hover:border-[#E5B65C]/50 shadow-[0_4px_20px_rgba(0,0,0,0.30)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.55),0_0_20px_rgba(229,182,92,0.18)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer">
        <div>
          {/* Mobile Media Thumbnail */}
          <div className="relative w-full h-32 bg-[#092557]/60 overflow-hidden">
            <ScholarshipThumbnail type={scholarship.thumbnailType} />

            {/* Urgency Badge */}
            <div className="absolute top-2 right-2 bg-[#040F24]/85 backdrop-blur-xs px-2.5 py-1 rounded-full border border-[#E5B65C]/30 text-[#E5B65C] text-[11px] font-['IBM_Plex_Sans_Arabic'] font-semibold flex items-center gap-1 shadow-xs">
              <span>{scholarship.deadlineText}</span>
              {scholarship.deadlineUrgency === 'warning' && (
                <svg width="10" height="12" viewBox="0 0 8 10" fill="currentColor">
                  <path d="M2 9H6V7.5C6 6.95 5.8 6.5 5.4 6.1C5 5.7 4.55 5.5 4 5.5C3.45 5.5 3 5.7 2.6 6.1C2.2 6.5 2 6.95 2 7.5V9ZM4 4.5C4.55 4.5 5 4.3 5.4 3.9C5.8 3.5 6 3.05 6 2.5V1H2V2.5C2 3.05 2.2 3.5 2.6 3.9C3 4.3 3.45 4.5 4 4.5ZM0 10V9H1V7.5C1 7 1.1 6.5 1.35 6.05C1.6 5.6 1.9 5.25 2.35 5C1.9 4.75 1.6 4.4 1.35 3.95C1.1 3.5 1 3 1 2.5V1H0V0H8V1H7V2.5C7 3 6.9 3.5 6.65 3.95C6.4 4.4 6.1 4.75 5.65 5C6.1 5.25 6.4 5.6 6.65 6.05C6.9 6.5 7 7 7 7.5V9H8V10H0Z" />
                </svg>
              )}
            </div>

            {/* 2px Gold Accent Bar at Bottom of Thumbnail that blooms softly on hover */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-l from-[#E5B65C] via-[#C88A32] to-transparent transition-all duration-300 group-hover:shadow-[0_0_10px_#E5B65C]" />
          </div>

          {/* Content Body */}
          <div className="p-4">
            <h4 className="text-base font-semibold text-[#DCE5EE] group-hover:text-white line-clamp-2 leading-snug font-['Tajawal'] text-right transition-colors">
              {scholarship.title}
            </h4>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="pt-2 border-t border-[#1B3F80]/40 flex items-center justify-between text-xs font-['Tajawal'] mb-3">
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
            className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-[#E5B65C] to-[#F3CE7A] hover:brightness-110 active:scale-[0.98] text-[#040F24] text-[13px] font-bold font-['IBM_Plex_Sans_Arabic'] shadow-[0_2px_10px_rgba(229,182,92,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
    <div className="group w-full h-full bg-[#061A3A]/40 backdrop-blur-md rounded-xl border border-[#1B3F80]/40 hover:border-[#E5B65C]/50 shadow-[0_4px_20px_rgba(0,0,0,0.30)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.55),0_0_20px_rgba(229,182,92,0.18)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer">
      {/* Top Accent Bar in Warm Gold matching Figma Layer 'Top Accent Bar' */}
      <div className="w-full h-1 bg-gradient-to-r from-[#E5B65C] to-[#C88A32]" />

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Top Row: Icon + Urgency Badge */}
          <div className="flex items-center justify-between mb-4">
            {/* Institution / Globe Icon in Rounded Box */}
            <div className="w-11 h-11 rounded-lg bg-[#092557]/60 border border-[#1B3F80]/50 flex items-center justify-center text-[#E5B65C] transition-transform duration-300 group-hover:scale-105 shadow-xs">
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
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5B65C]/10 border border-[#E5B65C]/25 text-[#E5B65C] text-xs font-['Tajawal'] font-medium shadow-xs">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{scholarship.deadlineText}</span>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-lg font-bold text-[#DCE5EE] group-hover:text-white mb-1.5 font-['IBM_Plex_Sans_Arabic'] text-right line-clamp-2 transition-colors">
            {scholarship.title}
          </h4>

          {/* Provider */}
          <p className="text-xs sm:text-sm text-[#8299B5] mb-4 font-['Tajawal'] text-right">
            {scholarship.provider}
          </p>
        </div>

        <div>
          {/* Badges / Tags */}
          <div className="flex items-center gap-2 mb-4 justify-start">
            {scholarship.degreeLevel && (
              <span className="px-2.5 py-0.5 rounded-md bg-[#092557]/40 border border-[#1B3F80]/40 text-[#DCE5EE] text-[11px] font-['Tajawal']">
                {convertKeyToAr(scholarship.degreeLevel, 'degreeLevels')}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-md bg-[#092557]/40 border border-[#1B3F80]/40 text-[#E5B65C] text-[11px] font-['Tajawal'] font-medium">
              {convertKeyToAr(scholarship.coverage, 'coverage')}
            </span>
          </div>

          {/* Primary Gold Rounded-Full Button: Balanced size */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply?.(scholarship);
            }}
            className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-[#E5B65C] to-[#F3CE7A] hover:brightness-110 active:scale-[0.98] text-[#040F24] text-[13px] sm:text-sm font-bold font-['IBM_Plex_Sans_Arabic'] shadow-[0_2px_12px_rgba(229,182,92,0.3)] hover:shadow-[0_4px_16px_rgba(229,182,92,0.45)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{toArabic('actions', 'apply_now')}</span>
            <span className="text-sm transition-transform duration-200 group-hover:-translate-x-1">←</span>
          </button>
        </div>
      </div>
    </div>
  );
};
