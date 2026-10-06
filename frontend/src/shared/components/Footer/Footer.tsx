import React from 'react';
import { BrandLogo } from '../Artwork/BrandVisuals';
import footerJson from '../../json/footer.json';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#040F24] border-t border-[#1B3F80]/80 pt-16 pb-12 text-[#8299B5] font-['Tajawal'] text-right">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#1B3F80]/60">
          {/* Brand info */}
          <div className="md:col-span-6 space-y-4">
            <BrandLogo size={42} textClass="text-2xl font-bold text-[#E5B65C]" />
            <p className="text-sm text-[#8299B5] max-w-md leading-relaxed">{footerJson.tagline}</p>
          </div>

          {/* Link columns */}
          {footerJson.columns.map((column) => (
            <div key={column.title} className="md:col-span-3 space-y-3">
              <h4 className="text-sm font-bold text-slate-100 font-['IBM_Plex_Sans_Arabic'] mb-4">
                {column.title}
              </h4>
              <ul className="space-y-2.5 text-xs text-[#8299B5]">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className={`transition-colors ${link.colorClass}`}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright strip */}
        <div className="pt-8 flex-between flex-col sm:flex-row text-xs text-[#5C7291] gap-4">
          <p>{footerJson.copyright}</p>
          <p className="text-[#8299B5]">{footerJson.madeWith}</p>
        </div>
      </div>
    </footer>
  );
};
