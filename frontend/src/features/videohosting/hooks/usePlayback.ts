import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { fetchLessonPlayback, putLessonProgress } from '@/features/videohosting/data/videoHostingFetchers';
import { resolveEngineLoader } from '@/features/videohosting/engines/registry';
import type { EngineEvent, PlaybackEngine, PlaybackState } from '@/features/videohosting/engines/types';
import type { LessonProgressHeartbeat, StreamGrant } from '@/features/videohosting/types';
import { videoPlayerActions } from '../../courses/context/videoPlayerStore';

const PROGRESS_INTERVAL_MS = 15_000;
const RESUME_PROMPT_MS = 6_000;
const MAX_POLL_MS = 10 * 60 * 1_000;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_HEARTBEAT_DELTA_SECONDS = 45;

type PlaybackStatus = PlaybackState | 'loading' | 'error';

type PlaybackFailure = {
  status?: number;
  code?: string;
  message: string;
};

export interface UsePlaybackOptions {
  courseSlug: string | null;
  lessonId: string | null;
  durationSeconds?: number;
  userId?: string | null;
  /** Dedicated stage host owned by PlayerStage; engines never attach elsewhere. */
  hostRef: RefObject<HTMLElement | null>;
}

export interface UsePlaybackResult {
  status: PlaybackStatus;
  grant: StreamGrant | null;
  errorCode: string | null;
  errorMessage: string | null;
  /** The accepted resume position, or 0 when the server position is outside the resume boundaries. */
  resumeAt: number;
  showResumePrompt: boolean;
  dismissResume: () => void;
  startFromBeginning: () => void;
  /** Re-mints the lesson grant and retries the complete resolution/attach flow. */
  retry: () => void;
  /** Flushes the current progress without blocking playback. */
  flushProgress: () => Promise<void>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function failureFrom(error: unknown): PlaybackFailure {
  if (isRecord(error)) {
    const status = typeof error.status === 'number' ? error.status : undefined;
    const code = typeof error.code === 'string' ? error.code : undefined;
    const message = typeof error.message === 'string' ? error.message : 'Unable to prepare this lesson for playback.';
    return { status, code, message };
  }
  return {
    message: error instanceof Error ? error.message : 'Unable to prepare this lesson for playback.',
  };
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === 'AbortError';
}

function errorCodeFor(failure: PlaybackFailure): string {
  if (failure.code) return failure.code;
  if (failure.status === 403) return 'not_entitled';
  if (failure.status === 404) return 'not_found';
  if (failure.status === 409) return 'not_ready';
  if (failure.status === 503) return 'raw_busy';
  return 'network';
}

function isReadinessConflict(failure: PlaybackFailure): boolean {
  if (failure.status !== 409) return false;
  return failure.code !== 'no_video';
}

function isRawBusy(failure: PlaybackFailure): boolean {
  return failure.code === 'raw_busy' || failure.status === 503;
}

function waitFor(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('The playback request was aborted.', 'AbortError'));
      return;
    }

    const timer = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      globalThis.clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      reject(new DOMException('The playback request was aborted.', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function resumePosition(resumeAt: number | undefined, durationSeconds: number): number {
  if (!Number.isFinite(resumeAt) || (resumeAt ?? 0) < 10) return 0;
  if (durationSeconds > 0 && (resumeAt ?? 0) > durationSeconds * 0.95) return 0;
  return Math.max(0, resumeAt ?? 0);
}

function sameHeartbeat(left: LessonProgressHeartbeat, right: LessonProgressHeartbeat): boolean {
  return (
    left.positionSeconds === right.positionSeconds &&
    left.watchedDeltaSeconds === right.watchedDeltaSeconds
  );
}

/**
 * Resolves a lesson playback grant, lazily attaches its registered engine, and
 * mirrors normalized engine events into the shared video-player store.
 *
 * PlayerStage owns the dedicated `hostRef`; engines attach only to that host
 * and it is emptied after every destroy. Grant requests are intentionally never
 * cached because the API returns expiring, IP-bound playback credentials.
 */
export function usePlayback({
  courseSlug,
  lessonId,
  durationSeconds = 0,
  userId = null,
  hostRef,
}: UsePlaybackOptions): UsePlaybackResult {
  const [status, setStatus] = useState<PlaybackStatus>(lessonId ? 'loading' : 'idle');
  const [grant, setGrant] = useState<StreamGrant | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);

  const engineRef = useRef<PlaybackEngine | null>(null);
  const unsubscribeRef = useRef<Array<() => void>>([]);
  const positionRef = useRef(0);
  const durationRef = useRef(Math.max(0, durationSeconds));
  const currentGrantRef = useRef<StreamGrant | null>(null);
  const resumePromptTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const tokenRetriedRef = useRef(false);
  const playbackSessionRef = useRef(0);

  const playingRef = useRef(false);
  const lastPlayingAtRef = useRef<number | null>(null);
  const pendingWatchedSecondsRef = useRef(0);
  const lastSuccessfulHeartbeatRef = useRef<LessonProgressHeartbeat | null>(null);
  const heartbeatDirtyRef = useRef(false);
  const heartbeatRequestRef = useRef<Promise<void> | null>(null);
  const queuedKeepaliveRef = useRef(false);
  const progressSessionRef = useRef(0);
  const flushProgressRef = useRef<((keepalive?: boolean) => Promise<void>) | null>(null);
  const courseSlugRef = useRef(courseSlug);
  const lessonIdRef = useRef(lessonId);
  const durationInputRef = useRef(durationSeconds);

  const dismissResume = useCallback(() => {
    setShowResumePrompt(false);
    if (resumePromptTimerRef.current !== null) {
      globalThis.clearTimeout(resumePromptTimerRef.current);
      resumePromptTimerRef.current = null;
    }
  }, []);

  const accumulatePlayingTime = useCallback(() => {
    if (!playingRef.current) {
      lastPlayingAtRef.current = null;
      return;
    }
    const now = Date.now();
    const previous = lastPlayingAtRef.current;
    lastPlayingAtRef.current = now;
    if (previous !== null && now >= previous) {
      pendingWatchedSecondsRef.current += (now - previous) / 1_000;
    }
  }, []);

  const flushProgress = useCallback(async (keepalive = false): Promise<void> => {
    accumulatePlayingTime();

    const slug = courseSlugRef.current;
    const currentLesson = lessonIdRef.current;
    if (!slug || !currentLesson) return;

    if (heartbeatRequestRef.current) {
      queuedKeepaliveRef.current ||= keepalive;
      return heartbeatRequestRef.current;
    }

    const payload: LessonProgressHeartbeat = {
      positionSeconds: Math.max(0, Math.floor(positionRef.current)),
      durationSeconds: Math.max(0, Math.floor(durationRef.current || durationInputRef.current)),
      watchedDeltaSeconds: Math.min(
        MAX_HEARTBEAT_DELTA_SECONDS,
        Math.max(0, Math.floor(pendingWatchedSecondsRef.current)),
      ),
    };
    const previous = lastSuccessfulHeartbeatRef.current;
    if (!heartbeatDirtyRef.current && previous && sameHeartbeat(previous, payload)) return;
    if (!heartbeatDirtyRef.current && !previous && payload.positionSeconds === 0 && payload.watchedDeltaSeconds === 0) return;

    const session = progressSessionRef.current;
    const sentDelta = payload.watchedDeltaSeconds;
    const request = putLessonProgress(slug, currentLesson, payload, keepalive ? { keepalive: true } : {})
      .then(() => {
        if (progressSessionRef.current !== session) return;
        pendingWatchedSecondsRef.current = Math.max(0, pendingWatchedSecondsRef.current - sentDelta);
        lastSuccessfulHeartbeatRef.current = payload;
        heartbeatDirtyRef.current = pendingWatchedSecondsRef.current > 0.001;
      })
      .catch(() => {
        if (progressSessionRef.current === session) heartbeatDirtyRef.current = true;
      })
      .finally(() => {
        if (heartbeatRequestRef.current !== request) return;
        heartbeatRequestRef.current = null;
        if (queuedKeepaliveRef.current) {
          const nextKeepalive = queuedKeepaliveRef.current;
          queuedKeepaliveRef.current = false;
          void flushProgressRef.current?.(nextKeepalive);
        }
      });

    heartbeatRequestRef.current = request;
    return request;
  }, [accumulatePlayingTime]);

  useEffect(() => {
    flushProgressRef.current = flushProgress;
    return () => {
      if (flushProgressRef.current === flushProgress) flushProgressRef.current = null;
    };
  }, [flushProgress]);

  const startFromBeginning = useCallback(() => {
    dismissResume();
    setResumeAt(0);
    positionRef.current = 0;
    engineRef.current?.seek(0);
  }, [dismissResume]);

  const retry = useCallback(() => {
    dismissResume();
    setStatus(lessonId ? 'loading' : 'idle');
    setErrorCode(null);
    setErrorMessage(null);
    videoPlayerActions.clearError();
    setRetryVersion((value) => value + 1);
  }, [dismissResume, lessonId]);

  useEffect(() => {
    videoPlayerActions.setPreferenceUser(userId);
  }, [userId]);

  useEffect(() => {
    let interval: ReturnType<typeof globalThis.setInterval> | null = null;
    const onVisibilityChange = () => {
      try {
        if (document.visibilityState === 'hidden') void flushProgress(true);
      } catch {
        // Visibility APIs are optional in embedded/private browser contexts.
      }
    };
    const onPageHide = () => {
      try {
        void flushProgress(true);
      } catch {
        // pagehide is best-effort; never block navigation.
      }
    };

    try {
      interval = globalThis.setInterval(() => {
        if (!playingRef.current) return;
        void flushProgress(false);
      }, PROGRESS_INTERVAL_MS);
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('pagehide', onPageHide);
    } catch {
      interval = null;
    }

    return () => {
      if (interval !== null) globalThis.clearInterval(interval);
      try {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', onPageHide);
      } catch {
        // Browser globals can disappear during an abrupt document teardown.
      }
    };
  }, [flushProgress]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const session = ++playbackSessionRef.current;
    ++progressSessionRef.current;
    courseSlugRef.current = courseSlug;
    lessonIdRef.current = lessonId;
    durationInputRef.current = durationSeconds;
    playingRef.current = false;
    lastPlayingAtRef.current = null;
    pendingWatchedSecondsRef.current = 0;
    lastSuccessfulHeartbeatRef.current = null;
    heartbeatDirtyRef.current = false;
    queuedKeepaliveRef.current = false;
    heartbeatRequestRef.current = null;
    positionRef.current = 0;
    durationRef.current = Math.max(0, durationSeconds);
    tokenRetriedRef.current = false;

    const controller = new AbortController();
    let active = true;
    let rawBusyTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
    let rawBusyAttempts = 0;
    const attachmentHost = hostRef.current;

    const clearSubscriptions = () => {
      unsubscribeRef.current.forEach((unsubscribe) => unsubscribe());
      unsubscribeRef.current = [];
    };

    const destroyEngine = () => {
      clearSubscriptions();
      const engine = engineRef.current;
      engineRef.current = null;
      currentGrantRef.current = null;
      videoPlayerActions.setEngine(null);
      if (engine) {
        try {
          engine.destroy();
        } catch {
          // Engines promise idempotent cleanup; a defensive guard protects lesson changes.
        }
      }
      try {
        attachmentHost?.replaceChildren();
      } catch {
        // A detached host may already have been removed by the owning stage.
      }
    };

    const surfaceError = (failure: PlaybackFailure | { code: string; message: string }) => {
      if (!active || controller.signal.aborted || session !== playbackSessionRef.current) return;
      const code = 'status' in failure ? errorCodeFor(failure) : failure.code || 'unknown';
      setStatus('error');
      setErrorCode(code);
      setErrorMessage(failure.message);
      videoPlayerActions.setError(code, failure.message);
    };

    const fetchGrantWithPolling = async (): Promise<StreamGrant> => {
      if (!courseSlug || !lessonId) throw { code: 'not_found', message: 'No lesson was selected.' } satisfies PlaybackFailure;
      const startedAt = Date.now();
      let delay = INITIAL_BACKOFF_MS;

      while (active && !controller.signal.aborted) {
        try {
          return await fetchLessonPlayback(courseSlug, lessonId, controller.signal);
        } catch (error) {
          if (!active || controller.signal.aborted || isAbortError(error)) throw error;
          const failure = failureFrom(error);
          if (!isReadinessConflict(failure) && !isRawBusy(failure)) throw failure;
          const elapsed = Date.now() - startedAt;
          if (elapsed >= MAX_POLL_MS) {
            throw {
              code: isRawBusy(failure) ? 'raw_busy' : 'not_ready',
              message: failure.message,
              status: failure.status,
            } satisfies PlaybackFailure;
          }
          const remaining = MAX_POLL_MS - elapsed;
          await waitFor(Math.min(delay, remaining), controller.signal);
          delay = Math.min(MAX_BACKOFF_MS, delay * 2);
        }
      }
      throw new DOMException('The playback request was aborted.', 'AbortError');
    };

    const attachGrant = async (nextGrant: StreamGrant, showResume: boolean, positionOverride?: number): Promise<void> => {
      if (!active || controller.signal.aborted || session !== playbackSessionRef.current) return;
      let loader;
      try {
        loader = resolveEngineLoader(nextGrant);
      } catch (error) {
        throw { code: 'unsupported', message: error instanceof Error ? error.message : 'This video cannot be played here.' } satisfies PlaybackFailure;
      }
      if (!loader) throw { code: 'unsupported', message: 'This video cannot be played here.' } satisfies PlaybackFailure;
      if (!attachmentHost) throw { code: 'unsupported', message: 'The player host is not available.' } satisfies PlaybackFailure;

      const module = await loader();
      if (!active || controller.signal.aborted || session !== playbackSessionRef.current) return;
      if (engineRef.current) {
        clearSubscriptions();
        const previousEngine = engineRef.current;
        engineRef.current = null;
        videoPlayerActions.setEngine(null);
        try {
          previousEngine.destroy();
        } catch {
          // A retry must not be prevented by an adapter's cleanup failure.
        }
      }
      const engine = module.createEngine();
      engineRef.current = engine;
      currentGrantRef.current = nextGrant;
      videoPlayerActions.setEngine(engine);
      videoPlayerActions.setCapabilities(engine.capabilities);
      let engineReportedState = false;

      const onTime = (event: Extract<EngineEvent, { type: 'time' }>) => {
        positionRef.current = Math.max(0, event.current);
        durationRef.current = Math.max(0, event.duration || nextGrant.durationSeconds || durationSeconds);
        videoPlayerActions.setTime(positionRef.current, durationRef.current, event.buffered);
      };
      const onState = (event: Extract<EngineEvent, { type: 'state' }>) => {
        engineReportedState = true;
        if (event.state === 'playing') {
          if (!playingRef.current) lastPlayingAtRef.current = Date.now();
          playingRef.current = true;
        } else {
          accumulatePlayingTime();
          playingRef.current = false;
        }
        setStatus(event.state);
        videoPlayerActions.setPlayState(event.state);
        if (event.state === 'paused' || event.state === 'ended') void flushProgress(false);
      };
      const onQualities = (event: Extract<EngineEvent, { type: 'qualities' }>) => {
        videoPlayerActions.setQualities(event.levels, event.current);
        videoPlayerActions.setCapabilities(engine.capabilities);
      };
      const onCaptions = (event: Extract<EngineEvent, { type: 'captions' }>) => {
        videoPlayerActions.setCaptionTracks(event.tracks, event.current);
        videoPlayerActions.setCapabilities(engine.capabilities);
      };
      const onReady = () => {
        engineReportedState = true;
        setStatus('ready');
        videoPlayerActions.setPlayState('ready');
      };
      const onError = (event: Extract<EngineEvent, { type: 'error' }>) => {
        if (!active || controller.signal.aborted || session !== playbackSessionRef.current || !event.fatal) return;
        engineReportedState = true;
        const tokenRejected = event.kind === 'token_invalid' || event.status === 401 || event.status === 403;
        const rawSourceFailed = nextGrant.mode === 'raw' && event.kind === 'network';
        if ((tokenRejected && (nextGrant.mode === 'hls' || nextGrant.mode === 'raw') || rawSourceFailed) && !tokenRetriedRef.current) {
          tokenRetriedRef.current = true;
          setStatus('loading');
          videoPlayerActions.setPlayState('loading');
          void (async () => {
            try {
              const freshGrant = await fetchLessonPlayback(courseSlug ?? '', lessonId ?? '', controller.signal);
              if (!active || controller.signal.aborted || session !== playbackSessionRef.current) return;
              clearSubscriptions();
              const oldEngine = engineRef.current;
              engineRef.current = null;
              videoPlayerActions.setEngine(null);
              try {
                oldEngine?.destroy();
              } catch {
                // Destruction is intentionally best-effort during recovery.
              }
              setGrant(freshGrant);
              currentGrantRef.current = freshGrant;
              await attachGrant(freshGrant, false, positionRef.current);
            } catch (error) {
              if (!isAbortError(error)) surfaceError(failureFrom(error));
            }
          })();
          return;
        }
        if (event.kind === 'raw_busy') {
          if (rawBusyTimer !== null) return;
          if (rawBusyAttempts >= 3) {
            surfaceError({ code: 'raw_busy', message: event.detail });
            return;
          }
          const retryDelay = Math.min(INITIAL_BACKOFF_MS * (2 ** rawBusyAttempts), 8_000);
          rawBusyAttempts += 1;
          setStatus('loading');
          videoPlayerActions.setPlayState('loading');
          rawBusyTimer = globalThis.setTimeout(() => {
            rawBusyTimer = null;
            void (async () => {
              try {
                const freshGrant = await fetchGrantWithPolling();
                if (!active || controller.signal.aborted || session !== playbackSessionRef.current) return;
                setGrant(freshGrant);
                await attachGrant(freshGrant, false, positionRef.current);
              } catch (error) {
                if (!isAbortError(error)) surfaceError(failureFrom(error));
              }
            })();
          }, retryDelay);
          return;
        }
        surfaceError({ code: event.kind, message: event.detail });
      };

      // Subscribe before attach: native engines can synchronously emit ready/state.
      unsubscribeRef.current = [
        engine.on('time', onTime),
        engine.on('state', onState),
        engine.on('qualities', onQualities),
        engine.on('captions', onCaptions),
        engine.on('ready', onReady),
        engine.on('error', onError),
      ];

      const knownDuration = Math.max(0, nextGrant.durationSeconds ?? durationSeconds);
      const startAt = positionOverride ?? resumePosition(nextGrant.resumeAt, knownDuration);
      positionRef.current = startAt;
      durationRef.current = knownDuration;
      setResumeAt(startAt);
      setGrant(nextGrant);
      await engine.attach(attachmentHost, nextGrant, {
        startAt,
        autoplay: false,
      });
      if (!active || controller.signal.aborted || session !== playbackSessionRef.current) {
        try {
          engine.destroy();
        } catch {
          // Stale engines must never remain attached after a lesson change.
        }
        return;
      }
      videoPlayerActions.setEngine(engine);
      videoPlayerActions.setCapabilities(engine.capabilities);
      if (!engineReportedState) {
        setStatus('ready');
        videoPlayerActions.setPlayState('ready');
      }
      if (showResume && startAt > 0) {
        setShowResumePrompt(true);
        resumePromptTimerRef.current = globalThis.setTimeout(() => {
          setShowResumePrompt(false);
          resumePromptTimerRef.current = null;
        }, RESUME_PROMPT_MS);
      }
    };

    if (!courseSlug || !lessonId) {
      videoPlayerActions.setEngine(null);
      return () => {
        active = false;
        controller.abort();
        if (rawBusyTimer !== null) globalThis.clearTimeout(rawBusyTimer);
        dismissResume();
        destroyEngine();
      };
    }

    videoPlayerActions.setSource(lessonId, durationSeconds);
    videoPlayerActions.clearError();
    setStatus('loading');
    setGrant(null);
    setResumeAt(0);
    setErrorCode(null);
    setErrorMessage(null);
    videoPlayerActions.setEngine(null);

    void (async () => {
      try {
        const nextGrant = await fetchGrantWithPolling();
        if (!active || controller.signal.aborted || session !== playbackSessionRef.current) return;
        setGrant(nextGrant);
        await attachGrant(nextGrant, true);
      } catch (error) {
        if (!active || controller.signal.aborted || isAbortError(error)) return;
        surfaceError(failureFrom(error));
      }
    })();

    return () => {
      void flushProgress(true);
      active = false;
      controller.abort();
      if (rawBusyTimer !== null) globalThis.clearTimeout(rawBusyTimer);
      dismissResume();
      destroyEngine();
    };
    // The host identity is part of attachment identity: changing it must not leave an engine in the old stage.
  }, [courseSlug, lessonId, durationSeconds, hostRef, retryVersion, dismissResume, accumulatePlayingTime, flushProgress]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const flushProgressForUi = useCallback(() => flushProgress(false), [flushProgress]);

  return useMemo(() => ({
    status: lessonId ? status : 'idle',
    grant: lessonId ? grant : null,
    errorCode: lessonId ? errorCode : null,
    errorMessage: lessonId ? errorMessage : null,
    resumeAt: lessonId ? resumeAt : 0,
    showResumePrompt: lessonId ? showResumePrompt : false,
    dismissResume,
    startFromBeginning,
    retry,
    flushProgress: flushProgressForUi,
  }), [dismissResume, errorCode, errorMessage, flushProgressForUi, grant, lessonId, retry, resumeAt, showResumePrompt, startFromBeginning, status]);
}
