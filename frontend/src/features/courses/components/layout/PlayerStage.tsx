import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Captions,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  PictureInPicture,
  RefreshCw,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { PlayerSelectMenu } from '@/features/courses/components/controls/PlayerSelectMenu';
import {
  useVideoPlayerState,
  videoPlayerActions,
} from '@/features/courses/context/videoPlayerStore';
import { videoProviderFor } from '@/features/courses/data/videoProviders';

/** How long controls linger after the last interaction while playback runs. */
const CONTROLS_AUTO_HIDE_MS = 2600;

/** 'MM:SS' lesson duration to milliseconds. */
function lessonDurationMs(duration: string): number {
  const [minutes, seconds] = duration.split(':').map(Number);
  if (Number.isFinite(minutes) && Number.isFinite(seconds)) return (minutes * 60 + seconds) * 1000;
  return 600 * 1000; // 10:00 fallback
}

/** Wall-clock label for the readout, e.g. '3:21'. */
function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Simulated buffered-ahead trail that stays slightly ahead of the playhead. */
function bufferedFraction(currentMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  return Math.min(currentMs / totalMs + 0.14, 1);
}

/** Modern transport: play/pause, ±10s skip, scrub, mute, menus, PiP, fullscreen. */
export const PlayerStage: React.FC = () => {
  const { course, activeLesson } = useCoursePlayer();
  const video = useVideoPlayerState();
  const stageRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  const provider = videoProviderFor(course?.id ?? '');
  const P = courseCopy.player;

  const isPlaying = video.playState === 'playing';
  const isBuffering = video.playState === 'buffering';
  const hasError = video.playState === 'error';
  // Controls stay put when paused; while playing they retreat after a pause in interaction.
  const controlsVisible = !isPlaying || showControls;

  const revealControls = useCallback(() => setShowControls(true), []);

  // Rebinding to a new lesson resets playback; the same lesson keeps its state
  // so switching tabs on mobile never interrupts the audio.
  useEffect(() => {
    if (activeLesson) {
      videoPlayerActions.syncVideoSource(activeLesson.id, lessonDurationMs(activeLesson.duration));
    }
  }, [activeLesson]);

  // Auto-hide the overlay while playback runs; visible state is derived, so no
  // setState fires directly in the effect body.
  useEffect(() => {
    if (!isPlaying || !showControls) return;
    hideTimerRef.current = window.setTimeout(() => setShowControls(false), CONTROLS_AUTO_HIDE_MS);
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, showControls]);

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
  // hosting adapters render inside the stage. The button stays provider-gated.
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

  useEffect(() => {
    const onEnter = () => setIsPip(true);
    const onLeave = () => setIsPip(false);
    document.addEventListener('enterpictureinpicture', onEnter);
    document.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      document.removeEventListener('enterpictureinpicture', onEnter);
      document.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, []);

  // Keyboard shortcuts: space/k play-pause, arrows ±10s, m mute, c captions,
  // f fullscreen, p picture-in-picture (when the provider supports it). Form
  // and menu buttons and repeat keys are never hijacked.
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
          setShowControls(true);
          break;
        case 'arrowright':
          event.preventDefault();
          videoPlayerActions.skip(10);
          setShowControls(true);
          break;
        case 'arrowleft':
          event.preventDefault();
          videoPlayerActions.skip(-10);
          setShowControls(true);
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

  const fractionFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = seekRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  };

  const onSeekPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsScrubbing(true);
    videoPlayerActions.seekFraction(fractionFromEvent(event));
  };

  const onSeekPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing && canSeek) videoPlayerActions.seekFraction(fractionFromEvent(event));
  };

  const onSeekPointerUp = () => setIsScrubbing(false);

  // Clicking the surface reveals hidden controls first, then toggles playback.
  const onStageClick = () => {
    if (hasError || isBuffering) return;
    if (isPlaying && !controlsVisible) {
      revealControls();
      return;
    }
    videoPlayerActions.togglePlay();
  };

  return (
    <div
      ref={stageRef}
      className={`player-stage group ${isPlaying && !controlsVisible ? 'cursor-none' : 'cursor-pointer'}`}
      onClick={onStageClick}
      onPointerMove={() => {
        if (isPlaying) revealControls();
      }}
    >
      <img
        src={course.thumbnailUrl}
        alt={activeLesson?.title ?? course.title}
        className={`player-video${isPlaying ? ' player-video-live' : ''}`}
      />
      <div className="player-video-shade" />

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

      {!hasError && !isBuffering && (
        <div
          className={`player-center transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="player-transport">
            <button
              type="button"
              className="player-skip"
              onClick={() => videoPlayerActions.skip(-10)}
              aria-label={P.skipBackwardLabel}
            >
              <RotateCcw size={18} />
            </button>

            <button
              type="button"
              className="player-play"
              onClick={videoPlayerActions.togglePlay}
              aria-label={isPlaying ? P.pauseLabel : P.playLabel}
            >
              {isPlaying ? (
                <Pause size={28} className="fill-white" />
              ) : (
                <Play size={30} className="fill-white translate-x-[-1px]" />
              )}
            </button>

            <button
              type="button"
              className="player-skip"
              onClick={() => videoPlayerActions.skip(10)}
              aria-label={P.skipForwardLabel}
            >
              <RotateCw size={18} />
            </button>
          </div>
        </div>
      )}

      {video.captions && isPlaying && activeLesson && (
        <div className="player-captions">
          <span className="player-caption-line">{activeLesson.title}</span>
        </div>
      )}

      <div
        className={`player-bar-bottom transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={seekRef}
          dir="ltr"
          className="player-seek"
          onPointerDown={onSeekPointerDown}
          onPointerMove={onSeekPointerMove}
          onPointerUp={onSeekPointerUp}
          role="slider"
          aria-label={P.summaryTitle}
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
        </div>

        <div className="player-controls">
          <span className="player-time" dir="ltr">
            {formatClock(video.currentMs)} / {formatClock(video.durationMs)}
          </span>

          <div className="player-tools">
            <button
              type="button"
              className="player-tool"
              aria-label={video.muted ? P.unmuteLabel : P.muteLabel}
              onClick={videoPlayerActions.toggleMute}
            >
              {video.muted ? <VolumeX size={15} className="text-blue-400" /> : <Volume2 size={15} />}
            </button>

            {provider.supports.captions && (
              <button
                type="button"
                className="player-tool"
                aria-label={P.captionsLabel}
                onClick={videoPlayerActions.toggleCaptions}
              >
                <Captions size={15} className={video.captions ? 'text-blue-400' : ''} />
              </button>
            )}

            {provider.supports.speed && (
              <PlayerSelectMenu
                icon={Gauge}
                label={P.speedLabel}
                value={video.speed}
                options={P.speeds}
                onSelect={videoPlayerActions.setSpeed}
              />
            )}

            {provider.supports.quality && (
              <PlayerSelectMenu
                icon={SlidersHorizontal}
                label={P.qualityLabel}
                value={video.quality}
                options={P.qualities}
                onSelect={videoPlayerActions.setQuality}
              />
            )}

            {provider.supports.pictureInPicture && (
              <button
                type="button"
                className="player-tool"
                aria-label={P.pipLabel}
                onClick={() => void requestPip()}
                disabled={!document.pictureInPictureEnabled}
              >
                <PictureInPicture size={15} className={isPip ? 'text-blue-400' : ''} />
              </button>
            )}

            {provider.supports.fullscreen && (
              <button
                type="button"
                className="player-tool"
                aria-label={isFullscreen ? P.exitFullscreenLabel : P.fullscreenLabel}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};