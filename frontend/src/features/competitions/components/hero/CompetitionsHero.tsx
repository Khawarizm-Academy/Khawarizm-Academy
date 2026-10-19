import React from 'react';
import { Trophy } from 'lucide-react';

/** Competitions page header: pillar badge, title, and the one-line purpose. */
export const CompetitionsHero: React.FC = () => (
  <header className="competitions-hero animate-fade-in-up">
    <span className="badge-gold">
      <Trophy size={13} />
      تحديات برمجية وعلمية
    </span>
    <h1 className="competitions-hero-title">المسابقات والتحديات</h1>
    <p className="competitions-hero-subtitle">
      اختبر مهاراتك في تحديات الخوارزميات والبرمجة، ونافس مجتمع خوارزم، وتابع إنجازاتك من لوحة تحكمك.
    </p>
  </header>
);
