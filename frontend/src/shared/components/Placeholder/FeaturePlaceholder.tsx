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
      <div className="w-full py-20 px-6 flex-col-center text-center gap-5 relative overflow-hidden">
        {/* Starfield behind the coming-soon chamber */}
        <OrbitalStageStars />

        <div className="animate-pop-in">
          <OrbitalEmblem tone="gold" icon={icon ?? <Hourglass size={36} />} />
        </div>

        <h1 className="relative z-10 text-3xl sm:text-4xl font-extrabold text-white font-['IBM_Plex_Sans_Arabic'] tracking-tight animate-pop-in animation-delay-100">
          {title}
        </h1>
        <p className="relative z-10 max-w-xl text-slate-400 text-sm sm:text-base font-['Tajawal'] leading-relaxed animate-pop-in animation-delay-200">
          {description}
        </p>
        <button
          type="button"
          className="relative z-10 mt-4 px-4 py-1.5 rounded-full bg-[#061A3A] border border-[#E5B65C]/50 text-[#E5B65C] text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold cursor-default animate-pop-in animation-delay-300 hover:animate-wiggle"
        >
          قيد الإعداد — قريبًا
        </button>
      </div>
    </main>
  );
};
