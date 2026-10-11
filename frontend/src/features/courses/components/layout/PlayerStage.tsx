import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { PlayerSettingsMenu } from '@/features/courses/components/controls/PlayerSettingsMenu';
import {
  useVideoPlayerState,
  videoPlayerActions,
} from '@/features/courses/context/videoPlayerStore';
import { videoProviderFor } from '@/features/courses/data/videoProviders';
import { formatClock, lessonDurationMs } from '@/features/courses/data/playerTime';

/** Simulated buffered-ahead trail that stays slightly ahead of the playhead. */
function bufferedFraction(currentMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  return Math.min(currentMs / totalMs + 0.14, 1);
}

/**
 * Video-first stage: the clip stays unobstructed while a slim, always-available
 * control bar keeps the everyday controls (play/pause, ±10s, seek, time, mute,
 * fullscreen) one tap away. Everything secondary lives in the settings menu.
 */
export const PlayerStage: React.FC = () => {
  const { course, activeLesson } = useCoursePlayer();
  const video = useVideoPlayerState();
  const stageRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);

  const provider = videoProviderFor(course?.id ?? '');
  const P = courseCopy.player;

  const isPlaying = video.playState === 'playing';
  const isBuffering = video.playState === 'buffering';
  const hasError = video.playState === 'error';

  // Rebinding to a new lesson resets playback; the same lesson keeps its state
  // so switching tabs on mobile never interrupts the audio.
  useEffect(() => {
    if (activeLesson) {
      videoPlayerActions.syncVideoSource(activeLesson.id, lessonDurationMs(activeLesson.duration));
    }
  }, [activeLesson]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (stageRef.current && document.fullscreenEnabled) {
      void stageRef.current.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Picture-in-Picture needs a real <video> element, which only the future
  // hosting adapters render inside the stage. The control stays provider-gated.
  const requestPip = useCallback(async () => {
    if (!document.pictureInPictureEnabled) return;
    const videoElement = stageRef.current?.querySelector('video');
    if (!videoElement) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await (videoElement as HTMLVideoElement).requestPictureInPicture().catch(() => undefined);
    }
  }, []);

  // Keyboard shortcuts: space/k play-pause, arrows ±10s, m mute, c captions,
  // f fullscreen, p picture-in-picture (when the provider supports it). Typing
  // targets and repeat/modifier keys are never hijacked.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (target?.closest('input, textarea, select, button')) return;
      switch (event.key.toLowerCase()) {
        case ' ':
        case 'k':
          event.preventDefault();
          videoPlayerActions.togglePlay();
          break;
        case 'arrowright':
          event.preventDefault();
          videoPlayerActions.skip(10);
          break;
        case 'arrowleft':
          event.preventDefault();
          videoPlayerActions.skip(-10);
          break;
        case 'm':
          event.preventDefault();
          videoPlayerActions.toggleMute();
          break;
        case 'c':
          event.preventDefault();
          videoPlayerActions.toggleCaptions();
          break;
        case 'f':
          if (document.fullscreenEnabled) {
            event.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'p':
          if (provider.supports.pictureInPicture) {
            event.preventDefault();
            void requestPip();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleFullscreen, requestPip, provider.supports.pictureInPicture]);

  if (!course) return null;

  const fraction = video.durationMs > 0 ? Math.min(video.currentMs / video.durationMs, 1) : 0;
  const canSeek = provider.supports.seek;

  const fractionFromEvent = (clientX: number) => {
    const rect = seekRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };

  const onSeekPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsScrubbing(true);
    const next = fractionFromEvent(event.clientX);
    setHoverFraction(next);
    videoPlayerActions.seekFraction(next);
  };

  const onSeekPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const next = fractionFromEvent(event.clientX);
    setHoverFraction(next);
    if (isScrubbing && canSeek) videoPlayerActions.seekFraction(next);
  };

  const onSeekPointerUp = () => setIsScrubbing(false);

  const onSeekPointerLeave = () => {
    if (!isScrubbing) setHoverFraction(null);
  };

  // Clicking the surface toggles playback; the bar and its menus stop propagation.
  const onStageToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (hasError || isBuffering) return;
    videoPlayerActions.togglePlay();
  };

  return (
    <div ref={stageRef} className="player-stage group cursor-pointer" onClick={onStageToggle}>
      <img
        src={course.thumbnailUrl}
        alt={activeLesson?.title ?? course.title}
        className="player-video"
      />

      <div className="player-source-chip" title={P.sourceLabel}>
        <span className={isPlaying ? 'player-source-dot player-source-dot-live' : 'player-source-dot'} />
        {provider.label}
      </div>

      {isBuffering && (
        <div className="player-center" aria-live="polite">
          <Loader2 size={36} className="animate-spin text-blue-400" />
          <span className="player-state-hint">{P.bufferingLabel}</span>
        </div>
      )}

      {hasError && (
        <div className="player-center" onClick={(event) => event.stopPropagation()}>
          <div className="player-state-card">
            <AlertTriangle size={28} className="text-danger-500" />
            <span className="player-state-title">{P.errorTitle}</span>
            <span className="player-state-note">{video.errorMessage ?? P.errorNote}</span>
            <button type="button" className="btn-outline-blue" onClick={videoPlayerActions.retry}>
              <RefreshCw size={14} />
              {P.retryLabel}
            </button>
          </div>
        </div>
      )}

      {!hasError && !isBuffering && !isPlaying && (
        <button
          type="button"
          className="player-hero"
          onClick={onStageToggle}
          aria-label={P.playLabel}
        >
          <span className="player-hero-toggle">
            <Play size={30} className="fill-white translate-x-[-1px]" />
          </span>
        </button>
      )}

      {video.captions && isPlaying && !hasError && activeLesson && (
        <div className="player-captions" key={video.sourceKey}>
          <span className="player-caption-line">{activeLesson.title}</span>
        </div>
      )}

      <div className="player-controls-bar" onClick={(event) => event.stopPropagation()}>
        <div
          ref={seekRef}
          dir="ltr"
          className="player-seek"
          onPointerDown={onSeekPointerDown}
          onPointerMove={onSeekPointerMove}
          onPointerUp={onSeekPointerUp}
          onPointerLeave={onSeekPointerLeave}
          role="slider"
          aria-label={P.seekLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fraction * 100)}
        >
          <div className="player-seek-track">
            {canSeek && (
              <div className="player-seek-buffered" style={{ width: `${bufferedFraction(video.currentMs, video.durationMs) * 100}%` }} />
            )}
            <div className="player-seek-fill" style={{ width: `${fraction * 100}%` }} />
            <div className="player-seek-thumb" style={{ left: `${fraction * 100}%` }} />
          </div>

          {hoverFraction !== null && (
            <span className="player-seek-tip" style={{ left: `${hoverFraction * 100}%` }}>
              {formatClock(hoverFraction * video.durationMs)}
            </span>
          )}
        </div>

        <div className="player-actions">
          <div className="player-actions-main">
            <button
              type="button"
              className="player-action-primary"
              onClick={onStageToggle}
              aria-label={isPlaying ? P.pauseLabel : P.playLabel}
            >
              {isPlaying ? (
                <Pause size={20} className="fill-white" />
              ) : (
                <Play size={20} className="fill-white translate-x-[-1px]" />
              )}
            </button>

            <button
              type="button"
              className="player-action-btn"
              onClick={() => videoPlayerActions.skip(-10)}
              aria-label={P.skipBackwardLabel}
            >
              <span className="player-skip-glyph">
                <RotateCcw size={20} />
                <span className="player-skip-badge">10</span>
              </span>
            </button>

            <button
              type="button"
              className="player-action-btn"
              onClick={() => videoPlayerActions.skip(10)}
              aria-label={P.skipForwardLabel}
            >
              <span className="player-skip-glyph">
                <RotateCw size={20} />
                <span className="player-skip-badge">10</span>
              </span>
            </button>
          </div>

          <span className="player-time" dir="ltr">
            {formatClock(video.currentMs)}
            <span className="player-time-total"> / {formatClock(video.durationMs)}</span>
          </span>

          <div className="player-actions-side">
            <button
              type="button"
              className="player-action-btn"
              aria-label={video.muted ? P.unmuteLabel : P.muteLabel}
              onClick={videoPlayerActions.toggleMute}
            >
              {video.muted ? <VolumeX size={18} className="text-blue-400" /> : <Volume2 size={18} />}
            </button>

            <PlayerSettingsMenu provider={provider} onRequestPictureInPicture={() => void requestPip()} />

            {provider.supports.fullscreen && (
              <button
                type="button"
                className="player-action-btn"
                aria-label={isFullscreen ? P.exitFullscreenLabel : P.fullscreenLabel}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
