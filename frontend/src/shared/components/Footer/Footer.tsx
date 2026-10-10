import React from 'react';
import { BrandLogo } from '../Artwork/BrandVisuals';
import footerJson from '../../json/footer.json';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          {/* Brand info */}
          <div className="footer-col-brand">
            <BrandLogo size={42} textClass="text-2xl font-bold text-gold-400" />
            <p className="footer-tagline">{footerJson.tagline}</p>
          </div>

          {/* Link columns */}
          {footerJson.columns.map((column) => (
            <div key={column.title} className="footer-col">
              <h4 className="footer-col-title">{column.title}</h4>
              <ul className="footer-links">
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
        <div className="flex-between footer-strip">
          <p>{footerJson.copyright}</p>
          <p className="text-slate-400">{footerJson.madeWith}</p>
        </div>
      </div>
    </footer>
  );
};
