import React from 'react';
import { CelestialCanvas } from '../Artwork/CelestialCanvas';

interface OrbitalEmblemProps {
  icon?: React.ReactNode;
  tone?: 'blue' | 'gold';
}

/** Per-pillar accent: ring, icon and star colors follow the emblem's tone. */
const TONE_CLASSES = {
  blue: {
    tile: 'emblem-tile emblem-tile-blue',
    ring: 'emblem-ring emblem-ring-blue',
    innerRing: 'emblem-ring-inner emblem-ring-inner-blue',
  },
  gold: {
    tile: 'emblem-tile emblem-tile-gold',
    ring: 'emblem-ring emblem-ring-gold',
    innerRing: 'emblem-ring-inner emblem-ring-inner-gold',
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
  const styles = TONE_CLASSES[tone];

  return (
    <div className="emblem-shell flex-center animate-float" aria-hidden={!icon}>
      {/* Outer dashed orbit ring */}
      <div className={`${styles.ring} animate-orbit-slow`} />
      {/* Inner counter-rotating ring */}
      <div className={`${styles.innerRing} animate-counter-orbit-slow`} />

      {/* Twinkling star dots pinned around the emblem */}
      {STARS.map((star) => (
        <span
          key={star.delay}
          className="emblem-star animate-star-twinkle"
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
      <div className={styles.tile}>{icon}</div>
    </div>
  );
};

/** Reading-chip starfield behind placeholder & 404 content. */
export const OrbitalStageStars: React.FC = () => (
  <CelestialCanvas className="absolute inset-0 pointer-events-none opacity-40" />
);
