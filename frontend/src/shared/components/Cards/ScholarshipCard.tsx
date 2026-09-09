import React from 'react';
import type { Scholarship } from '../../types/entities';
import { ScholarshipThumbnail } from '../Artwork/BrandVisuals';

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
      <div className="w-64 h-64 shrink-0 bg-[#061A3A]/60 backdrop-blur-md rounded-xl border border-[#1B3F80]/70 hover:border-[#E5B65C]/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(229,182,92,0.2)] transition-all duration-300 flex flex-col overflow-hidden">
        {/* Mobile Media Thumbnail */}
        <div className="relative w-full h-32 bg-[#092557] overflow-hidden">
          <ScholarshipThumbnail type={scholarship.thumbnailType} />

          {/* Urgency Badge */}
          <div className="absolute top-2 right-2 bg-[#040F24]/85 backdrop-blur-xs px-2.5 py-1 rounded-full border border-[#E5B65C]/40 text-[#E5B65C] text-[11px] font-['IBM_Plex_Sans_Arabic'] font-semibold flex items-center gap-1">
            <span>{scholarship.deadlineText}</span>
            {scholarship.deadlineUrgency === 'warning' && (
              <svg width="10" height="12" viewBox="0 0 8 10" fill="currentColor">
                <path d="M2 9H6V7.5C6 6.95 5.8 6.5 5.4 6.1C5 5.7 4.55 5.5 4 5.5C3.45 5.5 3 5.7 2.6 6.1C2.2 6.5 2 6.95 2 7.5V9ZM4 4.5C4.55 4.5 5 4.3 5.4 3.9C5.8 3.5 6 3.05 6 2.5V1H2V2.5C2 3.05 2.2 3.5 2.6 3.9C3 4.3 3.45 4.5 4 4.5ZM0 10V9H1V7.5C1 7 1.1 6.5 1.35 6.05C1.6 5.6 1.9 5.25 2.35 5C1.9 4.75 1.6 4.4 1.35 3.95C1.1 3.5 1 3 1 2.5V1H0V0H8V1H7V2.5C7 3 6.9 3.5 6.65 3.95C6.4 4.4 6.1 4.75 5.65 5C6.1 5.25 6.4 5.6 6.65 6.05C6.9 6.5 7 7 7 7.5V9H8V10H0Z" />
              </svg>
            )}
          </div>

          {/* 2px Gold Accent Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-l from-[#E5B65C] via-[#C88A32] to-transparent" />
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <h4 className="text-base font-semibold text-[#DCE5EE] line-clamp-2 leading-snug font-['Tajawal'] text-right">
            {scholarship.title}
          </h4>

          <div className="pt-2.5 border-t border-[#1B3F80]/80 flex items-center justify-between text-xs font-['Tajawal']">
            {/* Location with Pin */}
            <div className="flex items-center gap-1 text-[#8299B5]">
              <svg width="12" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{scholarship.location}</span>
            </div>

            {/* Coverage Tag */}
            <span className="text-[#E5B65C] font-semibold text-xs">
              {scholarship.coverage}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Card Variant (matches Desktop Screenshot)
  return (
    <div className="w-full bg-[#061A3A]/70 backdrop-blur-md rounded-xl border border-[#1B3F80]/80 hover:border-[#E5B65C]/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(229,182,92,0.2)] transition-all duration-300 p-5 flex flex-col justify-between">
      <div>
        {/* Top Row: Icon + Urgency Badge */}
        <div className="flex items-center justify-between mb-4">
          {/* Institution / Globe Icon in Gold Rounded Box */}
          <div className="w-11 h-11 rounded-xl bg-[#092557] border border-[#E5B65C]/30 flex items-center justify-center text-[#E5B65C]">
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
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#040F24] border border-[#E5B65C]/30 text-[#E5B65C] text-xs font-['Tajawal'] font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{scholarship.deadlineText}</span>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-lg font-bold text-[#DCE5EE] mb-1.5 font-['IBM_Plex_Sans_Arabic'] text-right line-clamp-2">
          {scholarship.title}
        </h4>

        {/* Provider */}
        <p className="text-xs text-[#8299B5] mb-4 font-['Tajawal'] text-right">
          {scholarship.provider}
        </p>
      </div>

      <div>
        {/* Badges / Tags */}
        <div className="flex items-center gap-2 mb-4 justify-start">
          {scholarship.degreeLevel && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#092557] border border-[#1B3F80] text-[#DCE5EE] text-[11px] font-['Tajawal']">
              {scholarship.degreeLevel}
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full bg-[#092557] border border-[#1B3F80] text-[#E5B65C] text-[11px] font-['Tajawal']">
            {scholarship.coverage}
          </span>
        </div>

        {/* Primary Gold Button */}
        <button
          onClick={() => onApply?.(scholarship)}
          className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#C88A32] to-[#E5B65C] hover:from-[#E5B65C] hover:to-[#C88A32] text-[#040F24] text-xs font-bold font-['Tajawal'] shadow-[0_0_12px_rgba(229,182,92,0.35)] hover:shadow-[0_0_18px_rgba(229,182,92,0.55)] transition-all cursor-pointer"
        >
          تقدم الآن
        </button>
      </div>
    </div>
  );
};
