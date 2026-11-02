import type { VideoProtection } from '@/features/videohosting/types';
import { playerCopy } from '@/features/videohosting/data/playerCopy';

export interface PlayerBadgesProps {
  protection?: VideoProtection | null;
  className?: string;
}

/** Displays only the protection claim supplied by the playback grant. */
export function PlayerBadges({ protection = 'none', className = '' }: PlayerBadgesProps) {
  const label = protection === 'encrypted'
    ? playerCopy.protectionEncrypted
    : protection === 'gated'
      ? playerCopy.protectionGated
      : playerCopy.protectionExternal;
  const protectionClass = protection === 'none' ? 'player-badge-external' : `player-badge-${protection}`;

  return (
    <div className={`player-badges ${className}`.trim()} aria-label={label}>
      <span className={`player-badge ${protectionClass}`}>
        {label}
      </span>
    </div>
  );
}

export default PlayerBadges;
