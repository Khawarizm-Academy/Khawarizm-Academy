import React from 'react';
import { Hourglass } from 'lucide-react';
import { OrbitalEmblem, OrbitalStageStars } from './OrbitalEmblem';

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

/**
 * Reusable "under construction" page used by placeholder routes
 * (events, competitions, dashboard, profile) so no tab ever renders blank.
 */
export const FeaturePlaceholder: React.FC<FeaturePlaceholderProps> = ({
  title,
  description,
  icon,
}) => {
  return (
    <main className="content-container">
      <div className="placeholder-stage">
        {/* Starfield behind the coming-soon chamber */}
        <OrbitalStageStars />

        <div className="animate-pop-in">
          <OrbitalEmblem tone="gold" icon={icon ?? <Hourglass size={36} />} />
        </div>

        <h1 className="placeholder-title animate-pop-in animation-delay-100">{title}</h1>
        <p className="placeholder-desc animate-pop-in animation-delay-200">{description}</p>
        <button
          type="button"
          className="placeholder-coming animate-pop-in animation-delay-300 hover:animate-wiggle"
        >
          قيد الإعداد — قريبًا
        </button>
      </div>
    </main>
  );
};
