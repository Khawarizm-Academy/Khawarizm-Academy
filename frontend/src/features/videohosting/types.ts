/** Video hosting types — the versioned API contract consumed by the player. */

/** Lifecycle of a hosted video, mirrored from the backend `VideoStatus`. */
export type HostedVideoStatus = 'uploading' | 'processing' | 'ready' | 'staged' | 'error';

export type VideoPlaybackMode = 'hls' | 'raw' | 'embed' | 'external';
export type VideoProtection = 'encrypted' | 'gated' | 'none';

/** One packaged quality variant, lowest bandwidth first. */
export interface HostedVideoQuality {
  quality: string;
  width: number;
  height: number;
  bandwidthBps: number;
}

export interface VideoCaptionTrack {
  language: string;
  label: string;
  url?: string;
  isDefault: boolean;
}

/** `GET /videos/:slug` — readiness and provider-backed metadata. */
export interface HostedVideoMeta {
  id: string;
  title?: string;
  status: HostedVideoStatus;
  durationSeconds?: number;
  /** Mounted watch sessions so far — present once the first grant is minted. */
  viewCount?: number;
  qualities: HostedVideoQuality[];
  playbackMode?: VideoPlaybackMode;
  protection?: VideoProtection;
  provider?: string;
  poster?: string;
  mimeType?: string;
}

/** Server-resolved lesson metadata included with a Phase 4 playback grant. */
export interface PlaybackLesson {
  id: string;
  title: string;
  nextLessonId: string | null;
}

/**
 * `POST /courses/:slug/lessons/:lessonId/playback` — short-lived playback grant.
 * HLS/raw tokens are IP-bound; embed/external grants intentionally have token="".
 */
export interface StreamGrant {
  token: string;
  assetId: string;
  /** HLS master URL; absent/empty outside HLS mode. */
  masterUrl?: string;
  /** HLS/raw/embed/external browser playback URL, when applicable. */
  playUrl?: string;
  mode?: VideoPlaybackMode;
  expiresAt: string;
  durationSeconds?: number;
  protection?: VideoProtection;
  provider?: string;
  embedUrl?: string;
  sourceUrl?: string;
  poster?: string;
  captions?: VideoCaptionTrack[];
  resumeAt?: number;
  qualities?: HostedVideoQuality[];
  lesson?: PlaybackLesson;
}

/** Enrolled-only heartbeat payload accepted by the Phase 4 progress endpoint. */
export interface LessonProgressHeartbeat {
  positionSeconds: number;
  durationSeconds: number;
  watchedDeltaSeconds: number;
}

export interface LessonProgressResult {
  positionSeconds: number;
  watchedSeconds: number;
  completed: boolean;
  completedAt?: string | null;
}
