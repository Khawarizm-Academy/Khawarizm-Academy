import React from 'react';
import { BrandLogo } from '../Artwork/BrandVisuals';

export const MobileHeader: React.FC<{ onLogoClick?: () => void }> = ({ onLogoClick }) => {
  return (
    <header className="glass-mobile-header">
      {/* Brand Title and Astrolabe Crest on the Right in RTL */}
      <div className="flex items-center gap-2.5">
        <BrandLogo size={36} textClass="text-lg font-bold text-[#E5B65C]" onClick={onLogoClick} />
      </div>
    </header>
  );
};
