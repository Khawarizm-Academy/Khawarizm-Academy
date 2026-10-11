import React from 'react';
import brandIcon from '@/assets/brand/generated/icon-192.png';

interface BrandSealProps {
  onClick?: () => void;
}

/** Illuminated brand ring shared by the hero header and the mobile brand header. */
export const BrandSeal: React.FC<BrandSealProps> = ({ onClick }) => (
  <div onClick={onClick} className="brand-seal">
    <div className="brand-seal-inner">
      <img src={brandIcon} alt="أكاديمية خوارزم" />
    </div>
  </div>
);