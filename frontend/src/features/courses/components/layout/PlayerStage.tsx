import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { useAuth } from '@/features/auth/context/authContext';
import { PlayerSettingsMenu } from '@/features/courses/components/controls/PlayerSettingsMenu';
import { useVideoPlayerState, videoPlayerActions } from '@/features/courses/context/videoPlayerStore';
import { formatClock, lessonDurationMs } from '@/features/courses/data/playerTime';
import { usePlayback } from '@/features/videohosting/hooks/usePlayback';
import { PlayerBadges } from '@/features/videohosting/components/overlays/PlayerBadges';
import { PlayerErrorPanel } from '@/features/videohosting/components/overlays/PlayerErrorPanel';
import { ResumePrompt } from '@/features/videohosting/components/overlays/ResumePrompt';
import { UpNextCard } from '@/features/videohosting/components/overlays/UpNextCard';
import { WatermarkOverlay } from '@/features/videohosting/components/overlays/WatermarkOverlay';
import type { VideoPlaybackMode } from '@/features/videohosting/types';
import { playerCopy } from '@/features/videohosting/data/playerCopy';

function formatArabicClock(milliseconds: number): string {
  return formatClock(milliseconds).replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)] ?? digit);
}

function sourceLabel(provider: string | undefined, mode: VideoPlaybackMode | undefined): string {
  if (provider === 'youtube') return 'YouTube';
  if (provider === 'vimeo') return 'Vimeo';
  if (provider === 'google_drive') return 'Google Drive';
  if (provider === 'telegram') return 'Telegram';
  if (mode === 'external') return playerCopy.sourceExternal;
  return provider ?? courseCopy.player.sourceLabel;
}

function clearTimer(timer: React.MutableRefObject<number | null>): void {
  if (timer.current !== null) window.clearTimeout(timer.current);
  timer.current = null;
}

const SHORTCUTS = [
  ['Space / K', playerCopy.shortcutPlayPause],
  ['J / L', playerCopy.shortcutSeek],
  ['M', courseCopy.player.muteLabel],
  ['C', playerCopy.captionsOn],
  ['F', courseCopy.player.fullscreenLabel],
  ['P', courseCopy.player.pipLabel],
  ['0–9', playerCopy.shortcutSeekToPercent],
  ['< / >', playerCopy.shortcutSpeed],
] as const;

/** One engine host and one control surface for every server-resolved playback mode. */
export const PlayerStage: React.FC = () => {
  const {
    course,
    courseSlug,
    activeLesson,
    selectLesson,
    completeLesson,
  } = useCoursePlayer();
  const { user } = useAuth();
  const navigate = useNavigate();
  const video = useVideoPlayerState();
  const P = courseCopy.player;
  const durationSecondsRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineHostRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const gestureTimerRef = useRef<number | null>(null);
  const rippleTimerRef = useRef<number | null>(null);
  const ignoreClickTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; side: 'back' | 'forward' } | null>(null);
  const ignoreTouchClickRef = useRef(false);
  const shortcutReturnFocusRef = useRef<HTMLElement | null>(null);
  const longPressRef = useRef<{ active: boolean; speed: string }>({ active: false, speed: '1x' });
  const handledEndedSourceRef = useRef('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [dismissedUpNextSource, setDismissedUpNextSource] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [seekRipple, setSeekRipple] = useState<'back' | 'forward' | null>(null);

  const durationFallback = activeLesson
    ? activeLesson.durationSeconds ?? lessonDurationMs(activeLesson.duration) / 1000
    : 0;
  const playback = usePlayback({
    hostRef: engineHostRef,
    courseSlug,
    lessonId: activeLesson?.id ?? '',
    durationSeconds: durationFallback,
    userId: user?.id ?? null,
  });
  const {
    status: playbackStatus,
    grant: playbackGrant,
    errorCode: playbackErrorCode,
  } = playback;

  useEffect(() => {
    durationSecondsRef.current = video.durationMs / 1000;
  }, [video.durationMs]);

  const isPlaying = video.playState === 'playing';
  const isEnded = video.playState === 'ended';
  const isProcessing = playbackErrorCode === 'not_ready' || playbackErrorCode === 'processing';
  const isLoading = playbackStatus === 'loading' || video.playState === 'loading';
  const isBuffering = video.playState === 'buffering' || isLoading || isProcessing;
  const errorCode = playbackErrorCode ?? video.errorCode;
  const isNoVideo = !playbackGrant && Boolean(
    activeLesson &&
      (activeLesson.hasVideo === false ||
        (activeLesson.kind !== undefined && activeLesson.kind !== 'video') ||
        errorCode === 'no_video'),
  );
  const isAutoplayBlocked = errorCode === 'autoplay_blocked';
  const hasError = !isNoVideo && !isAutoplayBlocked && (playbackStatus === 'error' || video.playState === 'error');
  const controlsAreVisible = controlsVisible || hasFocusWithin || !isPlaying || isBuffering;
  const canSeek = video.capabilities.seek && video.durationMs > 0;
  const fraction = video.durationMs > 0 ? Math.min(video.currentMs / video.durationMs, 1) : 0;
  const bufferedFraction = video.durationMs > 0 ? Math.min(video.bufferedMs / video.durationMs, 1) : 0;
  const lessons = useMemo(() => course?.modules.flatMap((module) => module.lessons) ?? [], [course]);
  const nextLessonId = playback.grant?.lesson?.nextLessonId ?? null;
  const nextLesson = nextLessonId ? lessons.find((lesson) => lesson.id === nextLessonId) : null;
  const showUpNext = isEnded && Boolean(nextLesson) && dismissedUpNextSource !== video.sourceKey;
  const engineReady = playbackStatus === 'ready' && Boolean(playbackGrant);
  const surfaceCanPlay = engineReady && !hasError && !isNoVideo;

  const revealControls = useCallback(() => {
    setControlsVisible(true);
  }, []);

  useEffect(() => {
    if (!isPlaying || hasFocusWithin || !controlsVisible) {
      clearTimer(controlsTimerRef);
      return;
    }
    controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 3000);
    return () => clearTimer(controlsTimerRef);
  }, [controlsVisible, hasFocusWithin, isPlaying]);

  useEffect(() => () => {
    clearTimer(controlsTimerRef);
    clearTimer(gestureTimerRef);
    clearTimer(rippleTimerRef);
    clearTimer(ignoreClickTimerRef);
  }, []);

  useEffect(() => {
    if (!course || !activeLesson || !isEnded || handledEndedSourceRef.current === video.sourceKey) return;
    handledEndedSourceRef.current = video.sourceKey;
    if (nextLesson) {
      completeLesson({ showProblems: false, showToast: false });
    } else {
      completeLesson();
    }
  }, [activeLesson, completeLesson, course, isEnded, nextLesson, video.sourceKey]);

  useEffect(() => {
    if (!playbackGrant) return;
    const playableUrl = playbackGrant.masterUrl || playbackGrant.playUrl || playbackGrant.embedUrl || playbackGrant.sourceUrl;
    if (!playableUrl) return;
    try {
      const origin = new URL(playableUrl, window.location.origin).origin;
      if (origin === window.location.origin || document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    } catch {
      // Invalid or unavailable optional preconnect targets never block playback.
    }
  }, [playbackGrant]);

  useEffect(() => {
    if (!course || !activeLesson || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const mediaSession = navigator.mediaSession;
    mediaSession.metadata = new MediaMetadata({
      title: activeLesson.title,
      artist: course.title,
      artwork: course.thumbnailUrl ? [{ src: course.thumbnailUrl, sizes: '512x512' }] : [],
    });
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => videoPlayerActions.play()],
      ['pause', () => videoPlayerActions.pause()],
      ['seekbackward', () => videoPlayerActions.skip(-10)],
      ['seekforward', () => videoPlayerActions.skip(10)],
      ['seekto', (details) => {
        if (typeof details.seekTime === 'number' && durationSecondsRef.current > 0) videoPlayerActions.seekFraction(details.seekTime / durationSecondsRef.current);
      }],
    ];
    const installed: MediaSessionAction[] = [];
    handlers.forEach(([action, handler]) => {
      try {
        mediaSession.setActionHandler(action, handler);
        installed.push(action);
      } catch {
        // Some action handlers are not supported on all media-session implementations.
      }
    });
    return () => {
      installed.forEach((action) => {
        try {
          mediaSession.setActionHandler(action, null);
        } catch {
          // Some action handlers are not supported on all media-session implementations.
        }
      });
      mediaSession.metadata = null;
    };
  }, [activeLesson, course]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!showShortcuts) return undefined;
    stageRef.current?.querySelector<HTMLButtonElement>('.player-shortcut-close')?.focus();
    return () => shortcutReturnFocusRef.current?.focus();
  }, [showShortcuts]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        (screen.orientation as ScreenOrientation & { unlock?: () => void }).unlock?.();
      } else if (stageRef.current && document.fullscreenEnabled) {
        await stageRef.current.requestFullscreen();
        const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
        if (window.matchMedia('(max-width: 767px)').matches && orientation.lock) {
          await orientation.lock('landscape').catch(() => undefined);
        }
      } else {
        const videoElement = engineHostRef.current?.querySelector('video') as (HTMLVideoElement & {
          webkitEnterFullscreen?: () => void;
        }) | null;
        if (videoElement?.webkitEnterFullscreen) {
          videoElement.addEventListener('webkitendfullscreen', () => setIsFullscreen(false), { once: true });
          videoElement.webkitEnterFullscreen();
          setIsFullscreen(true);
        }
      }
    } catch {
      // Fullscreen and orientation locking are optional browser capabilities.
    }
  }, []);

  const requestPictureInPicture = useCallback(async () => {
    const element = engineHostRef.current?.querySelector('video') as HTMLVideoElement & {
      requestPictureInPicture?: () => Promise<PictureInPictureWindow>;
    } | null;
    if (!element?.requestPictureInPicture) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await element.requestPictureInPicture();
    } catch {
      // Unsupported/blocked PiP stays a no-op; the regular video remains usable.
    }
  }, []);

  const requestAirPlay = useCallback(() => {
    const element = engineHostRef.current?.querySelector('video') as (HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void }) | null;
    element?.webkitShowPlaybackTargetPicker?.();
  }, []);

  const togglePlayback = useCallback(() => {
    if (isAutoplayBlocked) videoPlayerActions.clearError();
    if (isEnded) {
      videoPlayerActions.seekFraction(0);
      setDismissedUpNextSource('');
    }
    videoPlayerActions.togglePlay();
  }, [isAutoplayBlocked, isEnded]);

  const toggleControlsWithPlayback = useCallback(() => {
    if (!surfaceCanPlay || isBuffering || hasError || isNoVideo) return;
    togglePlayback();
  }, [hasError, isBuffering, isNoVideo, surfaceCanPlay, togglePlayback]);

  const fractionFromEvent = (clientX: number) => {
    const rect = seekRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };

  const onSeekPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is optional in older touch browsers.
    }
    setIsScrubbing(true);
    const next = fractionFromEvent(event.clientX);
    setHoverFraction(next);
    videoPlayerActions.seekFraction(next);
    revealControls();
  };

  const onSeekPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const next = fractionFromEvent(event.clientX);
    setHoverFraction(next);
    if (isScrubbing && canSeek) videoPlayerActions.seekFraction(next);
  };

  const onSeekPointerUp = () => {
    setIsScrubbing(false);
    playback.flushProgress();
  };

  const onSeekKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    const steps: Record<string, number> = {
      ArrowRight: 5,
      ArrowLeft: -5,
      PageUp: 60,
      PageDown: -60,
      Home: -video.currentMs / 1000,
      End: (video.durationMs - video.currentMs) / 1000,
    };
    const seconds = steps[event.key];
    if (seconds === undefined) return;
    event.preventDefault();
    videoPlayerActions.skip(seconds);
    playback.flushProgress();
    revealControls();
  };

  const onStagePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!surfaceCanPlay || event.pointerType !== 'touch' || (event.target as HTMLElement).closest('.player-controls-bar, button, iframe')) return;
    clearTimer(gestureTimerRef);
    longPressRef.current = { active: false, speed: video.speed };
    gestureTimerRef.current = window.setTimeout(() => {
      longPressRef.current.active = true;
      videoPlayerActions.setSpeed('2x');
    }, 500);
  };

  const onStagePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!surfaceCanPlay || event.pointerType !== 'touch' || (event.target as HTMLElement).closest('.player-controls-bar, button, iframe')) return;
    clearTimer(gestureTimerRef);
    if (longPressRef.current.active) {
      videoPlayerActions.setSpeed(longPressRef.current.speed);
      longPressRef.current.active = false;
      ignoreTouchClickRef.current = true;
      clearTimer(ignoreClickTimerRef);
      ignoreClickTimerRef.current = window.setTimeout(() => { ignoreTouchClickRef.current = false; }, 350);
      return;
    }
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const side = event.clientX < rect.left + rect.width / 2 ? 'back' : 'forward';
    const now = Date.now();
    const previousTap = lastTapRef.current;
    if (previousTap && now - previousTap.time <= 300 && previousTap.side === side) {
      videoPlayerActions.skip(side === 'forward' ? 10 : -10);
      playback.flushProgress();
      setSeekRipple(side);
      clearTimer(rippleTimerRef);
      rippleTimerRef.current = window.setTimeout(() => setSeekRipple(null), 750);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, side };
      setControlsVisible((visible) => !visible);
    }
    ignoreTouchClickRef.current = true;
    clearTimer(ignoreClickTimerRef);
    ignoreClickTimerRef.current = window.setTimeout(() => { ignoreTouchClickRef.current = false; }, 350);
  };

  const onStagePointerCancel = () => {
    clearTimer(gestureTimerRef);
    if (longPressRef.current.active) videoPlayerActions.setSpeed(longPressRef.current.speed);
    longPressRef.current.active = false;
  };

  const onStageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (ignoreTouchClickRef.current) {
      event.preventDefault();
      return;
    }
    if ((event.target as HTMLElement).closest('.player-controls-bar, .player-seek, .player-resume-prompt, .player-up-next-card, .player-shortcut-scrim, .player-center, button, iframe')) return;
    toggleControlsWithPlayback();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (showShortcuts) {
        if (event.key === 'Escape') setShowShortcuts(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, [role="menu"], [role="dialog"]')) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if ((event.shiftKey && event.key === '/') || event.key === '?') {
        event.preventDefault();
        shortcutReturnFocusRef.current = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : stageRef.current;
        setShowShortcuts(true);
        return;
      }
      if (event.shiftKey && event.key !== '<' && event.key !== '>') return;
      switch (key) {
        case ' ':
        case 'k':
          event.preventDefault();
          togglePlayback();
          revealControls();
          break;
        case 'arrowright':
        case 'l':
          event.preventDefault();
          videoPlayerActions.skip(10);
          playback.flushProgress();
          revealControls();
          break;
        case 'arrowleft':
        case 'j':
          event.preventDefault();
          videoPlayerActions.skip(-10);
          playback.flushProgress();
          revealControls();
          break;
        case 'm':
          videoPlayerActions.toggleMute();
          revealControls();
          break;
        case 'c':
          if (video.capabilities.captions) videoPlayerActions.toggleCaptions();
          revealControls();
          break;
        case 'f':
          if (video.capabilities.fullscreen) void toggleFullscreen();
          break;
        case 'p':
          if (video.capabilities.pip) void requestPictureInPicture();
          break;
        case '<':
        case ',': {
          const speeds = P.speeds;
          const index = speeds.indexOf(video.speed);
          videoPlayerActions.setSpeed(speeds[Math.max(index - 1, 0)] ?? '1x');
          revealControls();
          break;
        }
        case '>':
        case '.': {
          const speeds = P.speeds;
          const index = speeds.indexOf(video.speed);
          videoPlayerActions.setSpeed(speeds[Math.min(index + 1, speeds.length - 1)] ?? '1x');
          revealControls();
          break;
        }
        default:
          if (/^[0-9]$/.test(key) && canSeek) {
            videoPlayerActions.seekFraction(Number(key) / 10);
            playback.flushProgress();
            revealControls();
          }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [P.speeds, canSeek, playback, revealControls, requestPictureInPicture, showShortcuts, toggleFullscreen, togglePlayback, video.capabilities.captions, video.capabilities.fullscreen, video.capabilities.pip, video.speed]);

  if (!course) return null;

  const onEnroll = () => navigate(`/courses/${courseSlug}`);
  const showErrorPanel = (hasError || isNoVideo) && !isAutoplayBlocked;
  const stateAnnouncement = video.playState === 'playing'
    ? playerCopy.playingAnnouncement
    : video.playState === 'paused' || video.playState === 'idle'
      ? playerCopy.pausedAnnouncement
      : video.playState === 'ended'
        ? playerCopy.endedAnnouncement
        : playerCopy.bufferingAnnouncement;

  return (
    <div
      ref={stageRef}
      className={`player-stage group${controlsAreVisible ? '' : ' player-controls-auto-hidden'}`}
      onClick={onStageClick}
      onPointerMove={revealControls}
      onPointerDown={onStagePointerDown}
      onPointerUp={onStagePointerUp}
      onPointerCancel={onStagePointerCancel}
      onFocusCapture={() => { setHasFocusWithin(true); revealControls(); }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHasFocusWithin(false);
      }}
      role="region"
      aria-label={`${course.title}: ${activeLesson?.title ?? ''}`}
      tabIndex={0}
    >
      {playback.grant?.poster || course.thumbnailUrl ? (
        <img
          src={playback.grant?.poster || course.thumbnailUrl}
          alt=""
          aria-hidden="true"
          className="player-poster"
        />
      ) : null}
      <div ref={engineHostRef} className="player-engine-host" aria-label={activeLesson?.title ?? course.title} />

      {playback.grant && user && playback.grant.protection && playback.grant.protection !== 'none' && (
        <WatermarkOverlay label={user.email || user.fullName} />
      )}
      {playback.grant?.protection && <PlayerBadges protection={playback.grant.protection} />}

      {playback.grant && (
        <div className="player-source-chip" title={P.sourceLabel}>
          <span className={isPlaying ? 'player-source-dot player-source-dot-live' : 'player-source-dot'} />
          {sourceLabel(playback.grant.provider, playback.grant.mode)}
        </div>
      )}

      {isBuffering && !showErrorPanel && (
        <div className="player-center" aria-hidden="true">
          <Loader2 size={36} className="animate-spin text-blue-400" />
          <span className="player-state-hint">
            {isProcessing ? playerCopy.notReadyNote : P.bufferingLabel}
          </span>
        </div>
      )}

      {showErrorPanel && (
        <div className="player-center" onClick={(event) => event.stopPropagation()}>
          <PlayerErrorPanel
            code={isNoVideo ? 'no_video' : errorCode ?? 'network'}
            message={isNoVideo ? playerCopy.noVideoNote : playback.errorMessage ?? video.errorMessage}
            onRetry={playback.retry}
            onEnroll={onEnroll}
          />
        </div>
      )}

      {isAutoplayBlocked && !isBuffering && (
        <div className="player-center" onClick={(event) => event.stopPropagation()}>
          <div className="player-state-card">
            <Play size={32} className="text-blue-400" aria-hidden="true" />
            <span className="player-state-title">{playerCopy.autoplayTitle}</span>
            <span className="player-state-note">{playerCopy.autoplayNote}</span>
          </div>
        </div>
      )}

      {!showErrorPanel && !isBuffering && !isPlaying && !showUpNext && surfaceCanPlay && (
        <button
          type="button"
          className="player-hero"
          onClick={(event) => { event.stopPropagation(); togglePlayback(); }}
          aria-label={P.playLabel}
          aria-pressed={false}
        >
          <span className="player-hero-toggle">
            <Play size={30} className="fill-white translate-x-[-1px]" aria-hidden="true" />
          </span>
        </button>
      )}

      {playback.showResumePrompt && playback.resumeAt > 0 && surfaceCanPlay && (
        <ResumePrompt
          resumeAtSeconds={playback.resumeAt}
          onStartOver={playback.startFromBeginning}
          onDismiss={playback.dismissResume}
        />
      )}

      {showUpNext && nextLesson && (
        <UpNextCard
          title={nextLesson.title}
          onAdvance={() => {
            selectLesson(nextLesson.id);
          }}
          onCancel={() => setDismissedUpNextSource(video.sourceKey)}
        />
      )}

      {seekRipple && (
        <div className={`player-seek-ripple player-seek-ripple-${seekRipple}`} aria-hidden="true">
          {seekRipple === 'forward' ? <RotateCw size={22} /> : <RotateCcw size={22} />}
          <span>{seekRipple === 'forward' ? P.skipForwardLabel : P.skipBackwardLabel}</span>
        </div>
      )}

      <div
        className={`player-controls-bar${controlsAreVisible ? '' : ' player-controls-bar-hidden'}`}
        onClick={(event) => event.stopPropagation()}
        aria-hidden={!controlsAreVisible}
        inert={!controlsAreVisible}
      >
      <div
        ref={seekRef}
        dir="ltr"
        className={`player-seek${canSeek ? '' : ' player-seek-disabled'}`}
        onPointerDown={onSeekPointerDown}
        onPointerMove={onSeekPointerMove}
        onPointerUp={onSeekPointerUp}
        onPointerCancel={onSeekPointerUp}
        onPointerLeave={() => { if (!isScrubbing) setHoverFraction(null); }}
        onKeyDown={onSeekKeyDown}
        role="slider"
        tabIndex={canSeek && controlsAreVisible ? 0 : -1}
        aria-label={P.seekLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        aria-valuetext={`${formatArabicClock(video.currentMs)} من ${formatArabicClock(video.durationMs)}`}
        aria-disabled={!canSeek}
        aria-hidden={!controlsAreVisible}
        inert={!controlsAreVisible}
      >
        <div className="player-seek-track">
          {canSeek && <div className="player-seek-buffered" style={{ width: `${bufferedFraction * 100}%` }} />}
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
              onClick={togglePlayback}
              aria-label={isPlaying ? P.pauseLabel : P.playLabel}
              aria-pressed={isPlaying}
              disabled={!surfaceCanPlay || isBuffering}
            >
              {isPlaying ? <Pause size={20} className="fill-white" aria-hidden="true" /> : <Play size={20} className="fill-white translate-x-[-1px]" aria-hidden="true" />}
            </button>
            <button type="button" className="player-action-btn" onClick={() => videoPlayerActions.skip(-10)} aria-label={P.skipBackwardLabel} disabled={!canSeek}>
              <span className="player-skip-glyph"><RotateCcw size={20} aria-hidden="true" /><span className="player-skip-badge">10</span></span>
            </button>
            <button type="button" className="player-action-btn" onClick={() => videoPlayerActions.skip(10)} aria-label={P.skipForwardLabel} disabled={!canSeek}>
              <span className="player-skip-glyph"><RotateCw size={20} aria-hidden="true" /><span className="player-skip-badge">10</span></span>
            </button>
          </div>

          <span className="player-time" dir="ltr">
            {formatClock(video.currentMs)}
            <span className="player-time-total"> / {formatClock(video.durationMs)}</span>
          </span>

          <div className="player-actions-side">
            <button type="button" className="player-action-btn" aria-label={video.muted ? P.unmuteLabel : P.muteLabel} onClick={videoPlayerActions.toggleMute}>
              {video.muted ? <VolumeX size={18} className="text-blue-400" aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
            </button>
            <PlayerSettingsMenu onRequestPictureInPicture={requestPictureInPicture} onRequestAirPlay={requestAirPlay} />
            {video.capabilities.fullscreen && (
              <button type="button" className="player-action-btn" aria-label={isFullscreen ? P.exitFullscreenLabel : P.fullscreenLabel} onClick={() => void toggleFullscreen()}>
                {isFullscreen ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <span className="player-sr-status" role="status" aria-live="polite" aria-atomic="true">{stateAnnouncement}</span>

      {showShortcuts && (
        <div className="player-shortcut-scrim" role="presentation" onClick={() => setShowShortcuts(false)}>
          <section
            className="player-shortcut-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-shortcut-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setShowShortcuts(false);
              }
              if (event.key === 'Tab') {
                const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button'));
                const first = items[0];
                const last = items[items.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <div className="player-shortcut-head">
              <h2 id="player-shortcut-title">{playerCopy.shortcutHelpTitle}</h2>
              <button type="button" className="player-shortcut-close" onClick={() => setShowShortcuts(false)} aria-label={playerCopy.shortcutHelpClose}>×</button>
            </div>
            <dl>{SHORTCUTS.map(([key, label]) => <div key={key}><dt dir="ltr">{key}</dt><dd>{label}</dd></div>)}</dl>
            <button type="button" className="btn-outline-blue self-end" onClick={() => setShowShortcuts(false)}>{playerCopy.shortcutHelpClose}</button>
          </section>
        </div>
      )}

      <span className="sr-only" aria-live="polite">{isEnded ? playerCopy.endedAnnouncement : ''}</span>
      {playbackStatus === 'loading' && <span className="sr-only">{P.loadingLabel}</span>}
    </div>
  );
};
