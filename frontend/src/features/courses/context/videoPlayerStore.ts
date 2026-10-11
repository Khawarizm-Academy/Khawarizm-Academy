import { useSyncExternalStore } from 'react';

/** Lifecycle of the simulated playback engine. */
export type VideoPlayState = 'idle' | 'playing' | 'buffering' | 'error';

export interface VideoPlayerState {
  playState: VideoPlayState;
  /** Current playback-rate label, e.g. '1x'. */
  speed: string;
  /** Quality label, e.g. '720p'. */
  quality: string;
  captions: boolean;
  muted: boolean;
  currentMs: number;
  durationMs: number;
  /** Which lesson the store is bound to; changing it resets playback. */
  sourceKey: string;
  errorMessage: string | null;
}

const TICK_MS = 250;
const BUFFER_ON_PLAY_MS = 650;
const BUFFER_ON_SEEK_MS = 420;

/** External-store shape consumed only via useSyncExternalStore. */
interface VideoPlayerStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => VideoPlayerState;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  toggleCaptions: () => void;
  setSpeed: (speed: string) => void;
  setQuality: (quality: string) => void;
  skip: (seconds: number) => void;
  seekFraction: (fraction: number) => void;
  retry: () => void;
  fail: (message: string) => void;
  syncVideoSource: (sourceKey: string, durationMs: number) => void;
}

function rateOf(speed: string): number {
  const parsed = Number.parseFloat(speed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function createVideoPlayerStore(): VideoPlayerStore {
  const baseState: VideoPlayerState = {
    playState: 'idle',
    speed: '1x',
    quality: 'تلقائي',
    captions: true,
    muted: false,
    currentMs: 0,
    durationMs: 600_000,
    sourceKey: '',
    errorMessage: null,
  };

  let state: VideoPlayerState = { ...baseState };
  const listeners = new Set<() => void>();
  let tickTimer: number | null = null;
  let bufferTimer: number | null = null;

  const emit = () => listeners.forEach((listener) => listener());
  const patch = (partial: Partial<VideoPlayerState>) => {
    state = { ...state, ...partial };
    emit();
  };

  const stopTicker = () => {
    if (tickTimer !== null) {
      window.clearInterval(tickTimer);
      tickTimer = null;
    }
  };

  const clearBuffer = () => {
    if (bufferTimer !== null) {
      window.clearTimeout(bufferTimer);
      bufferTimer = null;
    }
  };

  const startTicker = () => {
    stopTicker();
    tickTimer = window.setInterval(() => {
      const step = TICK_MS * rateOf(state.speed);
      const nextMs = Math.min(state.currentMs + step, state.durationMs);
      patch({ currentMs: nextMs });
      if (nextMs >= state.durationMs) {
        stopTicker();
        patch({ playState: 'idle' });
      }
    }, TICK_MS);
  };

  const bufferThen = (delayMs: number, resume: () => void) => {
    clearBuffer();
    patch({ playState: 'buffering' });
    bufferTimer = window.setTimeout(() => {
      bufferTimer = null;
      resume();
    }, delayMs);
  };

  const store: VideoPlayerStore = {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stopTicker();
      };
    },
    getSnapshot: () => state,

    play: () => {
      if (state.playState === 'playing' || state.playState === 'buffering') return;
      if (state.currentMs >= state.durationMs) patch({ currentMs: 0 });
      bufferThen(BUFFER_ON_PLAY_MS, () => {
        patch({ playState: 'playing' });
        startTicker();
      });
    },

    pause: () => {
      stopTicker();
      clearBuffer();
      if (state.playState === 'playing' || state.playState === 'buffering') {
        patch({ playState: 'idle' });
      }
    },

    togglePlay: () => {
      if (state.playState === 'playing') store.pause();
      else store.play();
    },

    toggleMute: () => patch({ muted: !state.muted }),

    toggleCaptions: () => patch({ captions: !state.captions }),

    setSpeed: (speed) => patch({ speed }),

    setQuality: (quality) => patch({ quality }),

    skip: (seconds) => {
      if (state.playState === 'error') return;
      const stepMs = seconds * 1000;
      const nextMs = Math.min(Math.max(state.currentMs + stepMs, 0), state.durationMs);
      patch({ currentMs: nextMs });
      if (state.playState === 'playing') {
        bufferThen(BUFFER_ON_SEEK_MS, () => {
          patch({ playState: 'playing' });
          startTicker();
        });
      }
    },

    seekFraction: (fraction) => {
      if (state.playState === 'error') return;
      const clamped = Math.min(Math.max(fraction, 0), 1);
      patch({ currentMs: clamped * state.durationMs });
      if (state.playState === 'playing') {
        bufferThen(BUFFER_ON_SEEK_MS, () => {
          patch({ playState: 'playing' });
          startTicker();
        });
      }
    },

    retry: () => {
      stopTicker();
      clearBuffer();
      patch({ playState: 'idle', errorMessage: null });
    },

    fail: (message) => {
      stopTicker();
      clearBuffer();
      patch({ playState: 'error', errorMessage: message });
    },

    /** Rebinds the engine to a new lesson; same lesson keeps playback across tab switches. */
    syncVideoSource: (sourceKey, durationMs) => {
      if (state.sourceKey === sourceKey) return;
      stopTicker();
      clearBuffer();
      // New lesson restarts playback but keeps the viewer's speed/quality/captions.
      state = { ...state, playState: 'idle', currentMs: 0, durationMs, sourceKey, errorMessage: null };
      emit();
    },
  };

  return store;
}

const store = createVideoPlayerStore();

/** Read-only snapshot of the playback engine; subscribed comps re-render only on video changes. */
export function useVideoPlayerState(): VideoPlayerState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/** Imperative actions the controls call; stable module singleton, never changes identity. */
export const videoPlayerActions: VideoPlayerStore = store;