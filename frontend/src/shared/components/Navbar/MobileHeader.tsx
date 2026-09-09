import React from 'react';
import { BrandLogo } from '../Artwork/BrandVisuals';

export const MobileHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-[#040F24]/95 backdrop-blur-md border-b border-[#1B3F80]/40 px-4 sm:px-6 flex items-center justify-between shadow-[0_2px_15px_rgba(0,0,0,0.4)]">
      {/* Brand Title and Astrolabe Crest on the Right in RTL */}
      <div className="flex items-center gap-2.5">
        <BrandLogo size={36} textClass="text-lg font-bold text-[#E5B65C]" />
      </div>
    </header>
  );
};
