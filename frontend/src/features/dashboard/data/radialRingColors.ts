/**
 * Token mirrors for the radial progress ring's SVG strokes. Hex values are
 * required because the glow effect appends an alpha suffix (`${color}80`).
 *   active -> blue-400, done -> gold-400, track -> navy-800
 */
export const RING_COLORS = {
  active: '#29A9FF',
  done: '#E5B65C',
  track: '#092557',
} as const;