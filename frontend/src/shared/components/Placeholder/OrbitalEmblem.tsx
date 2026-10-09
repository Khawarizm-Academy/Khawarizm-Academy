import React from 'react';
import { CelestialCanvas } from '../Artwork/CelestialCanvas';

interface OrbitalEmblemProps {
  icon?: React.ReactNode;
  tone?: 'blue' | 'gold';
}

/** Per-pillar accent: ring, icon and star colors follow the emblem's tone. */
const TONE_STYLES = {
  blue: {
    tile: 'border-[#1B3F80] text-[#29A9FF] shadow-[0_0_24px_rgba(41,169,255,0.25)]',
    ring: 'border-[#29A9FF]/40',
    innerRing: 'border-[#E5B65C]/50',
  },
  gold: {
    tile: 'border-[#1B3F80] text-[#E5B65C] shadow-[0_0_24px_rgba(229,182,92,0.25)]',
    ring: 'border-[#E5B65C]/40',
    innerRing: 'border-[#29A9FF]/50',
  },
} as const;

/** Twinkle dots drift at fixed offsets so the emblem sits inside its own constellation. */
interface TwinkleStar {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  size: number;
  delay: string;
}

const STARS: TwinkleStar[] = [
  { top: '-6px', right: '14px', size: 4, delay: '0s' },
  { top: '30%', left: '-10px', size: 3, delay: '0.8s' },
  { bottom: '16%', right: '-8px', size: 5, delay: '1.6s' },
  { bottom: '-4px', left: '22%', size: 3, delay: '2.4s' },
];

/**
 * Floating observatory emblem: an icon tile hovering between two orbiting
 * rings with twinkling stars — the playful centerpiece of empty & 404 pages.
 */
export const OrbitalEmblem: React.FC<OrbitalEmblemProps> = ({ icon, tone = 'gold' }) => {
  const styles = TONE_STYLES[tone];

  return (
    <div className="relative w-36 h-36 flex-center animate-float" aria-hidden={!icon}>
      {/* Outer dashed orbit ring */}
      <div className={`absolute inset-0 rounded-full border border-dashed ${styles.ring} animate-orbit-slow`} />
      {/* Inner counter-rotating ring */}
      <div className={`absolute inset-4 rounded-full border ${styles.innerRing} animate-counter-orbit-slow`} />

      {/* Twinkling star dots pinned around the emblem */}
      {STARS.map((star) => (
        <span
          key={star.delay}
          className="absolute rounded-full bg-[#E5B65C] animate-star-twinkle"
          style={{
            top: star.top,
            right: star.right,
            bottom: star.bottom,
            left: star.left,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
          }}
        />
      ))}

      {/* Floating icon tile at the center */}
      <div className={`relative z-10 w-20 h-20 rounded-2xl bg-[#092557] border flex-center shadow-lg ${styles.tile}`}>
        {icon}
      </div>
    </div>
  );
};

/** Reading-chip starfield behind placeholder & 404 content. */
export const OrbitalStageStars: React.FC = () => (
  <CelestialCanvas className="absolute inset-0 pointer-events-none opacity-40" />
);
