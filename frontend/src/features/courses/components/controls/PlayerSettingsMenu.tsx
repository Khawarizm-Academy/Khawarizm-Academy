import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  Airplay,
  Captions,
  Check,
  Gauge,
  MonitorPlay,
  PictureInPicture,
  Settings2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { playerCopy } from '@/features/videohosting/data/playerCopy';
import { useVideoPlayerState, videoPlayerActions } from '@/features/courses/context/videoPlayerStore';

export interface PlayerSettingsMenuProps {
  onRequestPictureInPicture?: () => void;
  onRequestAirPlay?: () => void;
  /** Compatibility for the existing stage call site; capabilities are never read from it. */
  [key: string]: unknown;
}

const MENU_ID = 'player-settings-menu';

function isSheetViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 639px)').matches
    : false;
}

function isDesktopViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 640px)').matches
    : true;
}

function qualityLabel(id: string, label: string): string {
  return id === 'auto' ? courseCopy.player.qualities[0] ?? 'تلقائي' : label || id;
}

/** Store-driven player controls in an accessible portal menu. */
export function PlayerSettingsMenu({
  onRequestPictureInPicture,
  onRequestAirPlay,
}: PlayerSettingsMenuProps) {
  const video = useVideoPlayerState();
  const P = courseCopy.player;
  const [isOpen, setIsOpen] = useState(false);
  const [isSheet, setIsSheet] = useState(isSheetViewport);
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const sheetQuery = window.matchMedia('(max-width: 639px)');
    const desktopQuery = window.matchMedia('(min-width: 640px)');
    const sync = () => {
      setIsSheet(sheetQuery.matches);
      setIsDesktop(desktopQuery.matches);
    };
    sync();
    sheetQuery.addEventListener?.('change', sync);
    desktopQuery.addEventListener?.('change', sync);
    return () => {
      sheetQuery.removeEventListener?.('change', sync);
      desktopQuery.removeEventListener?.('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || isSheet) return undefined;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      menu.style.top = `${Math.max(12, rect.top - 8)}px`;
      menu.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, isSheet]);

  const closeMenu = (restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus;
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const appRoot = isSheet ? document.getElementById('root') : null;
    const trigger = triggerRef.current;
    const wasInert = appRoot?.hasAttribute('inert') ?? false;
    appRoot?.setAttribute('inert', '');
    const firstItem = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]',
    );
    firstItem?.focus();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!trigger?.contains(target) && !menuRef.current?.contains(target)) closeMenu(false);
    };
    const onDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
      if (isSheet && event.key === 'Tab') {
        const tabbable = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? []);
        if (tabbable.length === 0) {
          event.preventDefault();
          menuRef.current?.focus();
          return;
        }
        const first = tabbable[0];
        const last = tabbable[tabbable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onDocumentKeyDown);
      if (!wasInert) appRoot?.removeAttribute('inert');
      if (restoreFocusRef.current) trigger?.focus();
      restoreFocusRef.current = false;
    };
  }, [isOpen, isSheet]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    const target = event.target as HTMLElement;
    if (target.matches('input, select')) return;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]',
      ) ?? [],
    );
    const current = items.indexOf(target);
    if (current < 0 || items.length === 0) return;
    const next = event.key === 'ArrowDown'
      ? (current + 1) % items.length
      : event.key === 'ArrowUp'
        ? (current - 1 + items.length) % items.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : null;
    if (next === null) return;
    event.preventDefault();
    items[next]?.focus();
  };

  const runAndClose = (action: () => void) => {
    action();
    closeMenu();
  };

  const activeQuality = video.quality === 'تلقائي' ? 'auto' : video.quality;
  const autoLabel = qualityLabel('auto', '');
  const qualityOptions = [
    { id: 'auto', label: autoLabel },
    ...video.qualities
      .filter((level) => level.id !== 'auto')
      .map((level) => ({ id: level.id, label: qualityLabel(level.id, level.label) })),
  ];

  const panel = (
    <div
      ref={menuRef}
      id={MENU_ID}
      className={isSheet ? 'player-menu player-menu-sheet' : 'player-menu player-menu-anchored'}
      role="menu"
      aria-labelledby="player-settings-title"
      onKeyDown={onMenuKeyDown}
      dir="rtl"
    >
      <div className="player-menu-head">
        <Settings2 aria-hidden="true" size={14} />
        <span id="player-settings-title">{P.settingsLabel}</span>
      </div>

      {video.capabilities.speed && (
        <section className="player-menu-section" aria-labelledby="player-speed-label">
          <span id="player-speed-label" className="player-menu-label">
            <Gauge aria-hidden="true" size={13} /> {P.speedLabel}
          </span>
          <div className="player-menu-chips" role="group" aria-labelledby="player-speed-label">
            {P.speeds.map((speed) => (
              <button
                key={speed}
                type="button"
                role="menuitemradio"
                aria-checked={speed === video.speed}
                tabIndex={speed === video.speed ? 0 : -1}
                className={speed === video.speed ? 'player-menu-chip player-menu-chip-active' : 'player-menu-chip player-menu-chip-idle'}
                onClick={() => runAndClose(() => videoPlayerActions.setSpeed(speed))}
              >
                {speed}
              </button>
            ))}
          </div>
        </section>
      )}

      {video.capabilities.quality && video.qualities.length > 1 && (
        <section className="player-menu-section" aria-labelledby="player-quality-label">
          <span id="player-quality-label" className="player-menu-label">
            <MonitorPlay aria-hidden="true" size={13} /> {P.qualityLabel}
          </span>
          <div className="player-menu-chips" role="group" aria-labelledby="player-quality-label">
            {qualityOptions.map((quality) => (
              <button
                key={quality.id}
                type="button"
                role="menuitemradio"
                aria-checked={quality.id === activeQuality}
                tabIndex={quality.id === activeQuality ? 0 : -1}
                className={quality.id === activeQuality ? 'player-menu-chip player-menu-chip-active' : 'player-menu-chip player-menu-chip-idle'}
                onClick={() => runAndClose(() => videoPlayerActions.setQuality(quality.id))}
              >
                {quality.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {video.capabilities.captions && video.captionTracks.length > 0 && (
        <section className="player-menu-section" aria-labelledby="player-captions-label">
          <button
            type="button"
            className="player-menu-row"
            role="menuitemcheckbox"
            aria-checked={video.captions}
            onClick={() => videoPlayerActions.toggleCaptions()}
          >
            <Captions aria-hidden="true" size={15} />
            <span id="player-captions-label" className="player-menu-row-label">
              {video.captions ? P.captionsLabel : playerCopy.captionsOff}
            </span>
            <span className={video.captions ? 'player-menu-toggle player-menu-toggle-on' : 'player-menu-toggle player-menu-toggle-off'}>
              {video.captions && <Check aria-hidden="true" size={12} />}
            </span>
          </button>
          {video.captionTracks.length > 0 && (
            <label className="player-menu-select-row">
              <span className="player-menu-label">{P.captionsLabel}</span>
              <select
                aria-label={P.captionsLabel}
                value={video.captionLanguage ?? ''}
                onChange={(event) => videoPlayerActions.setCaptionLanguage(event.target.value || null)}
              >
                <option value="">{playerCopy.captionsOff}</option>
                {video.captionTracks.map((track) => (
                  <option key={track.language} value={track.language}>{track.label}</option>
                ))}
              </select>
            </label>
          )}
        </section>
      )}

      <section className="player-menu-section player-menu-volume" aria-labelledby="player-volume-label">
        <label id="player-volume-label" className="player-menu-label" htmlFor="player-volume-range">
          {video.muted ? <VolumeX aria-hidden="true" size={13} /> : <Volume2 aria-hidden="true" size={13} />}
          {playerCopy.volumeLabel}
        </label>
        <div className="player-menu-volume-controls">
          <input
            id="player-volume-range"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={video.muted ? 0 : video.volume}
            aria-label={playerCopy.volumeLabel}
            onChange={(event) => videoPlayerActions.setVolume(Number(event.target.value))}
          />
          <button
            type="button"
            role="menuitem"
            className="player-menu-row"
            aria-label={video.muted ? P.unmuteLabel : P.muteLabel}
            onClick={() => runAndClose(videoPlayerActions.toggleMute)}
          >
            {video.muted ? P.unmuteLabel : P.muteLabel}
          </button>
        </div>
      </section>

      {video.capabilities.pip && onRequestPictureInPicture && (
        <button type="button" role="menuitem" className="player-menu-row" onClick={() => runAndClose(onRequestPictureInPicture)}>
          <PictureInPicture aria-hidden="true" size={15} />
          <span className="player-menu-row-label">{P.pipLabel}</span>
        </button>
      )}

      {video.capabilities.airplay && onRequestAirPlay && (
        <button type="button" role="menuitem" className="player-menu-row" onClick={() => runAndClose(onRequestAirPlay)}>
          <Airplay aria-hidden="true" size={15} />
          <span className="player-menu-row-label">{playerCopy.airPlay}</span>
        </button>
      )}

      {isDesktop && (
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={video.theaterMode}
          className="player-menu-row"
          onClick={() => runAndClose(videoPlayerActions.toggleTheaterMode)}
        >
          <MonitorPlay aria-hidden="true" size={15} />
          <span className="player-menu-row-label">{video.theaterMode ? playerCopy.exitTheaterMode : playerCopy.theaterMode}</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        id="player-settings-trigger"
        type="button"
        className="player-action-btn"
        aria-label={P.settingsLabel}
        aria-haspopup={isSheet ? 'dialog' : 'menu'}
        aria-expanded={isOpen}
        aria-controls={isOpen ? MENU_ID : undefined}
        onClick={() => {
          if (isOpen) {
            restoreFocusRef.current = true;
            setIsOpen(false);
          } else {
            setIsOpen(true);
          }
        }}
      >
        <Settings2 aria-hidden="true" size={18} />
      </button>
      {isOpen && typeof document !== 'undefined' && createPortal(
        isSheet ? (
          <div
            className="player-menu-scrim"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) closeMenu();
            }}
          >
            <section
              className="player-menu-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="player-settings-title"
              tabIndex={-1}
            >
              {panel}
            </section>
          </div>
        ) : panel,
        document.body,
      )}
    </>
  );
}

export default PlayerSettingsMenu;
