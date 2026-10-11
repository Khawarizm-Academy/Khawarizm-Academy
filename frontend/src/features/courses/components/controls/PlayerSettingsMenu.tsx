import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Captions,
  Check,
  Gauge,
  MonitorPlay,
  PictureInPicture,
  Settings2,
} from 'lucide-react';
import { courseCopy } from '@/features/courses/data/courseCopy';
import type { VideoProvider } from '@/features/courses/data/videoProviders';
import {
  useVideoPlayerState,
  videoPlayerActions,
} from '@/features/courses/context/videoPlayerStore';

interface PlayerSettingsMenuProps {
  provider: VideoProvider;
  /** Picture-in-Picture is a capability action, so it stays a callback from the stage. */
  onRequestPictureInPicture: () => void;
}

/** Panel width used when anchoring to the trigger; mirrors the w-64 class. */
const MENU_WIDTH = 256;

const isSheetViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

/**
 * One consolidated player menu: speed, quality, captions and Picture-in-Picture.
 * It renders through a portal so the stage's clipping never crops it — a bottom
 * sheet on phones, an upward-anchored popover on wider screens.
 */
export const PlayerSettingsMenu: React.FC<PlayerSettingsMenuProps> = ({
  provider,
  onRequestPictureInPicture,
}) => {
  const video = useVideoPlayerState();
  const P = courseCopy.player;
  const [isOpen, setIsOpen] = useState(false);
  const [isSheet, setIsSheet] = useState(isSheetViewport);
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Track the surface so the panel switches between sheet and popover.
  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');
    const sync = () => setIsSheet(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // Anchor the popover just above the trigger, clamped to the viewport.
  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(rect.left, 12),
      window.innerWidth - MENU_WIDTH - 12,
    );
    setAnchor({ left, bottom: window.innerHeight - rect.top + 8 });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || isSheet) return;
    place();
  }, [isOpen, isSheet, place]);

  // Close on outside press or Escape so the menu never lingers over the video.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const inside =
        triggerRef.current?.contains(target) || menuRef.current?.contains(target);
      if (!inside) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', place);
    };
  }, [isOpen, place]);

  const chipClass = (isActive: boolean) =>
    isActive ? 'player-menu-chip player-menu-chip-active' : 'player-menu-chip player-menu-chip-idle';

  const panel = (
    <div
      ref={menuRef}
      className={isSheet ? 'player-menu player-menu-sheet animate-fade-in-up' : 'player-menu player-menu-anchored animate-dropdown-in'}
      style={!isSheet && anchor ? { left: anchor.left, bottom: anchor.bottom } : undefined}
    >
      <div className="player-menu-head">
        <Settings2 size={14} />
        <span>{P.settingsLabel}</span>
      </div>

      {provider.supports.speed && (
        <div className="player-menu-section">
          <span className="player-menu-label">
            <Gauge size={13} /> {P.speedLabel}
          </span>
          <div className="player-menu-chips">
            {P.speeds.map((speed) => (
              <button
                key={speed}
                type="button"
                className={chipClass(speed === video.speed)}
                onClick={() => videoPlayerActions.setSpeed(speed)}
              >
                {speed}
              </button>
            ))}
          </div>
        </div>
      )}

      {provider.supports.quality && (
        <div className="player-menu-section">
          <span className="player-menu-label">
            <MonitorPlay size={13} /> {P.qualityLabel}
          </span>
          <div className="player-menu-chips">
            {P.qualities.map((quality) => (
              <button
                key={quality}
                type="button"
                className={chipClass(quality === video.quality)}
                onClick={() => videoPlayerActions.setQuality(quality)}
              >
                {quality}
              </button>
            ))}
          </div>
        </div>
      )}

      {provider.supports.captions && (
        <button type="button" className="player-menu-row" onClick={videoPlayerActions.toggleCaptions}>
          <Captions size={15} />
          <span className="player-menu-row-label">{P.captionsLabel}</span>
          <span className={video.captions ? 'player-menu-toggle player-menu-toggle-on' : 'player-menu-toggle player-menu-toggle-off'}>
            {video.captions && <Check size={12} />}
          </span>
        </button>
      )}

      {provider.supports.pictureInPicture && (
        <button type="button" className="player-menu-row" onClick={onRequestPictureInPicture}>
          <PictureInPicture size={15} />
          <span className="player-menu-row-label">{P.pipLabel}</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="relative" ref={triggerRef}>
        <button
          type="button"
          className="player-action-btn"
          aria-label={P.settingsLabel}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <Settings2 size={18} />
        </button>
      </div>

      {isOpen && createPortal(panel, document.body)}
    </>
  );
};
