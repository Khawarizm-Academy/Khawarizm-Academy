import { useSyncExternalStore } from 'react';
import type {
  EngineCapabilities,
  PlaybackEngine,
  PlaybackState,
  QualityLevel,
} from '@/features/videohosting/engines/types';
import type { VideoCaptionTrack } from '@/features/videohosting/types';

/** Store lifecycle mirrors a real attached engine; there is no synthetic clock. */
export type VideoPlayState = PlaybackState | 'loading' | 'error';

export interface VideoPlayerState {
  playState: VideoPlayState;
  speed: string;
  quality: string;
  qualities: QualityLevel[];
  captions: boolean;
  captionLanguage: string | null;
  captionTracks: VideoCaptionTrack[];
  muted: boolean;
  volume: number;
  currentMs: number;
  durationMs: number;
  bufferedMs: number;
  sourceKey: string;
  errorMessage: string | null;
  errorCode: string | null;
  capabilities: EngineCapabilities;
  theaterMode: boolean;
}

const DEFAULT_CAPABILITIES: EngineCapabilities = {
  speed: false,
  quality: false,
  captions: false,
  pip: false,
  fullscreen: true,
  seek: false,
  airplay: false,
};

interface VideoPlayerStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => VideoPlayerState;
  setPreferenceUser: (userId: string | null) => void;
  setEngine: (engine: PlaybackEngine | null) => void;
  setSource: (sourceKey: string, durationSeconds?: number) => void;
  setPlayState: (playState: VideoPlayState) => void;
  setTime: (currentSeconds: number, durationSeconds: number, bufferedSeconds?: number) => void;
  setCapabilities: (capabilities: EngineCapabilities) => void;
  setQualities: (qualities: QualityLevel[], current: string) => void;
  setCaptionTracks: (tracks: VideoCaptionTrack[], current: string | null) => void;
  setError: (code: string, message: string) => void;
  clearError: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  toggleCaptions: () => void;
  setCaptionLanguage: (language: string | null) => void;
  setSpeed: (speed: string) => void;
  setQuality: (quality: string) => void;
  skip: (seconds: number) => void;
  seekFraction: (fraction: number) => void;
  toggleTheaterMode: () => void;
}

const initialState: VideoPlayerState = {
  playState: 'idle',
  speed: '1x',
  quality: 'auto',
  qualities: [],
  captions: false,
  captionLanguage: null,
  captionTracks: [],
  muted: false,
  volume: 1,
  currentMs: 0,
  durationMs: 0,
  bufferedMs: 0,
  sourceKey: '',
  errorMessage: null,
  errorCode: null,
  capabilities: DEFAULT_CAPABILITIES,
  theaterMode: false,
};

interface PlayerPreferences {
  speed?: string;
  quality?: string;
  captionLanguage?: string | null;
  muted?: boolean;
  volume?: number;
  theaterMode?: boolean;
}

const SPEEDS = new Set(['0.5x', '0.75x', '1x', '1.25x', '1.5x', '1.75x', '2x']);
const PREFS_PREFIX = 'khawarizm:player:';

function parseRate(speed: string): number {
  const rate = Number.parseFloat(speed);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function preferenceKey(userId: string | null): string {
  return `${PREFS_PREFIX}${userId ? encodeURIComponent(userId) : 'guest'}:preferences`;
}

function createVideoPlayerStore(): VideoPlayerStore {
  let state: VideoPlayerState = { ...initialState };
  let engine: PlaybackEngine | null = null;
  let currentPreferenceKey = preferenceKey(null);
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());
  const patch = (partial: Partial<VideoPlayerState>) => {
    state = { ...state, ...partial };
    emit();
  };
  const savePreferences = () => {
    if (typeof window === 'undefined') return;
    try {
      const preferences: PlayerPreferences = {
        speed: state.speed,
        quality: state.quality,
        captionLanguage: state.captionLanguage,
        muted: state.muted,
        volume: state.volume,
        theaterMode: state.theaterMode,
      };
      window.localStorage.setItem(currentPreferenceKey, JSON.stringify(preferences));
    } catch {
      // Private browsing, storage quotas, and policy restrictions are non-fatal.
    }
  };
  const persist = (partial: Partial<VideoPlayerState>) => {
    patch(partial);
    savePreferences();
  };

  const store: VideoPlayerStore = {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,

    setPreferenceUser: (userId) => {
      const nextKey = preferenceKey(userId);
      if (currentPreferenceKey === nextKey) return;
      currentPreferenceKey = nextKey;
      let saved: PlayerPreferences = {};
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(nextKey);
          if (raw) saved = JSON.parse(raw) as PlayerPreferences;
        } catch {
          saved = {};
        }
      }
      const speed = typeof saved.speed === 'string' && SPEEDS.has(saved.speed) ? saved.speed : '1x';
      const volume = typeof saved.volume === 'number' ? clamp(saved.volume, 0, 1) : 1;
      const captionLanguage = typeof saved.captionLanguage === 'string' ? saved.captionLanguage : null;
      patch({
        speed,
        quality: typeof saved.quality === 'string' && saved.quality !== 'تلقائي' ? saved.quality : 'auto',
        captionLanguage,
        captions: Boolean(captionLanguage),
        muted: Boolean(saved.muted),
        volume,
        theaterMode: Boolean(saved.theaterMode),
      });
      engine?.setRate(parseRate(speed));
      engine?.setMuted(Boolean(saved.muted));
      engine?.setVolume(volume);
      engine?.setQuality(typeof saved.quality === 'string' && saved.quality !== 'تلقائي' ? saved.quality : 'auto');
      engine?.setCaptions(captionLanguage);
    },

    setEngine: (nextEngine) => {
      engine = nextEngine;
      if (!engine) {
        patch({ capabilities: DEFAULT_CAPABILITIES });
        return;
      }
      engine.setRate(parseRate(state.speed));
      engine.setMuted(state.muted);
      engine.setVolume(state.volume);
      engine.setQuality(state.quality === 'auto' ? 'auto' : state.quality);
      engine.setCaptions(state.captions ? state.captionLanguage : null);
      patch({ capabilities: engine.capabilities });
    },

    setSource: (sourceKey, durationSeconds = 0) => {
      if (state.sourceKey === sourceKey) return;
      patch({
        sourceKey,
        playState: 'loading',
        currentMs: 0,
        durationMs: Math.max(0, durationSeconds * 1000),
        bufferedMs: 0,
        qualities: [],
        captionTracks: [],
        errorMessage: null,
        errorCode: null,
      });
    },

    setPlayState: (playState) => patch({ playState }),
    setTime: (currentSeconds, durationSeconds, bufferedSeconds = 0) => {
      const duration = Math.max(0, durationSeconds * 1000);
      patch({
        currentMs: clamp(currentSeconds * 1000, 0, duration || Number.MAX_SAFE_INTEGER),
        durationMs: duration,
        bufferedMs: clamp(bufferedSeconds * 1000, 0, duration || Number.MAX_SAFE_INTEGER),
      });
    },
    setCapabilities: (capabilities) => patch({ capabilities }),
    setQualities: (qualities, current) => {
      const preferred = state.quality;
      const selected = preferred !== 'auto' && qualities.some((level) => level.id === preferred)
        ? preferred
        : current || 'auto';
      engine?.setQuality(selected);
      patch({ qualities, quality: selected });
    },
    setCaptionTracks: (tracks, current) => {
      const selected = current ?? state.captionLanguage;
      const selectedAvailable = selected !== null && tracks.some((track) => track.language === selected);
      if (selectedAvailable) engine?.setCaptions(selected);
      else if (tracks.length > 0) engine?.setCaptions(null);
      patch({ captionTracks: tracks, captionLanguage: selected, captions: selectedAvailable });
    },
    setError: (code, message) => patch({ playState: 'error', errorCode: code, errorMessage: message }),
    clearError: () => patch({ playState: 'idle', errorCode: null, errorMessage: null }),

    play: () => {
      if (!engine) return;
      void engine.play().catch(() => undefined);
    },
    pause: () => engine?.pause(),
    togglePlay: () => {
      if (state.playState === 'playing' || state.playState === 'buffering') store.pause();
      else store.play();
    },
    toggleMute: () => store.setMuted(!state.muted),
    setMuted: (muted) => {
      engine?.setMuted(muted);
      persist({ muted });
    },
    setVolume: (volume) => {
      const nextVolume = clamp(volume, 0, 1);
      engine?.setVolume(nextVolume);
      persist({ volume: nextVolume, muted: nextVolume === 0 ? true : state.muted });
      if (nextVolume === 0) engine?.setMuted(true);
    },
    toggleCaptions: () => {
      const language = state.captions
        ? null
        : state.captionLanguage ?? state.captionTracks.find((track) => track.isDefault)?.language ?? state.captionTracks[0]?.language ?? null;
      engine?.setCaptions(language);
      persist({ captionLanguage: language, captions: language !== null });
    },
    setCaptionLanguage: (language) => {
      engine?.setCaptions(language);
      persist({ captionLanguage: language, captions: language !== null });
    },
    setSpeed: (speed) => {
      const validSpeed = SPEEDS.has(speed) ? speed : '1x';
      engine?.setRate(parseRate(validSpeed));
      persist({ speed: validSpeed });
    },
    setQuality: (quality) => {
      const normalized = quality === 'auto' || quality === 'تلقائي' ? 'auto' : quality;
      engine?.setQuality(normalized);
      persist({ quality: normalized });
    },
    skip: (seconds) => {
      if (!engine || !state.capabilities.seek) return;
      engine.seek(clamp(state.currentMs / 1000 + seconds, 0, state.durationMs / 1000));
    },
    seekFraction: (fraction) => {
      if (!engine || !state.capabilities.seek || state.durationMs <= 0) return;
      engine.seek(clamp(fraction, 0, 1) * (state.durationMs / 1000));
    },
    toggleTheaterMode: () => persist({ theaterMode: !state.theaterMode }),
  };

  return store;
}

const store = createVideoPlayerStore();

/** Read-only snapshot of the active real playback engine. */
export function useVideoPlayerState(): VideoPlayerState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/** Primitive selector for page-shell layout without subscribing it to media timeupdates. */
export function useVideoPlayerTheaterMode(): boolean {
  return useSyncExternalStore(store.subscribe, () => store.getSnapshot().theaterMode);
}

/** Stable commands and event-to-store setters shared by the player surfaces. */
export const videoPlayerActions: VideoPlayerStore = store;
