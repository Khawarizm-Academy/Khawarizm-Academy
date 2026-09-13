import React from 'react';
import { BrandLogo } from '../Artwork/BrandVisuals';

export const MobileHeader: React.FC<{
  onLogoClick?: () => void;
  onLoginClick?: () => void;
}> = ({ onLogoClick, onLoginClick }) => {
  return (
    <header className="glass-mobile-header flex-between">
      {/* Brand Title and Astrolabe Crest on the Right in RTL */}
      <div className="flex items-center gap-2.5">
        <BrandLogo size={36} textClass="text-lg font-bold text-[#E5B65C]" onClick={onLogoClick} />
      </div>

      {/* Login CTA on the Left in RTL */}
      {onLoginClick && (
        <button
          onClick={onLoginClick}
          className="btn-gold py-1 px-3 text-xs font-bold cursor-pointer"
        >
          دخول
        </button>
      )}
    </header>
  );
};
