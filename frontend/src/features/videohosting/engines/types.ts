import type { StreamGrant, VideoCaptionTrack } from '@/features/videohosting/types';

export type PlaybackEngineId = 'hls' | 'native' | 'file' | 'youtube' | 'vimeo';
export type PlaybackState = 'idle' | 'ready' | 'playing' | 'paused' | 'buffering' | 'ended';
export type PlaybackErrorKind =
  | 'token_invalid'
  | 'raw_busy'
  | 'not_ready'
  | 'network'
  | 'unsupported'
  | 'autoplay_blocked'
  | 'unknown';

export interface EngineCapabilities {
  speed: boolean;
  quality: boolean;
  captions: boolean;
  pip: boolean;
  fullscreen: boolean;
  seek: boolean;
  airplay: boolean;
}

export interface QualityLevel {
  id: string;
  label: string;
  height?: number;
  bandwidthBps?: number;
}

export type EngineEvent =
  | { type: 'time'; current: number; duration: number; buffered: number }
  | { type: 'state'; state: PlaybackState }
  | { type: 'qualities'; levels: QualityLevel[]; current: string }
  | { type: 'captions'; tracks: VideoCaptionTrack[]; current: string | null }
  | {
      type: 'error';
      kind: PlaybackErrorKind;
      fatal: boolean;
      retryable: boolean;
      detail: string;
      status?: number;
    }
  | { type: 'ready' };

export interface PlaybackEngine {
  readonly id: PlaybackEngineId;
  readonly capabilities: EngineCapabilities;
  attach(host: HTMLElement, grant: StreamGrant, options: { startAt: number; autoplay: boolean }): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  setRate(rate: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  setQuality(id: string | 'auto'): void;
  setCaptions(language: string | null): void;
  getVideoElement(): HTMLVideoElement | null;
  requestPictureInPicture(): Promise<void>;
  requestAirPlay(): Promise<void>;
  on<E extends EngineEvent['type']>(type: E, listener: (event: Extract<EngineEvent, { type: E }>) => void): () => void;
  destroy(): void;
}

export interface EngineModule {
  createEngine(): PlaybackEngine;
}

export type EngineLoader = () => Promise<EngineModule>;
