/**
 * Video hosting types — the stream contract the player consumes.
 *
 * The backend owns Telegram-backed encrypted HLS; the frontend only ever sees a
 * readiness record and a short-lived playback grant (never a Telegram URL, never
 * an AES key until the gated endpoint hands it over to the player).
 */

/** Lifecycle of a hosted video, mirrored from the backend `VideoStatus`. */
export type HostedVideoStatus = 'uploading' | 'processing' | 'ready' | 'staged' | 'error';

/** One packaged quality variant, lowest bandwidth first. */
export interface HostedVideoQuality {
  quality: string;
  width: number;
  height: number;
  bandwidthBps: number;
}

/** `GET /videos/:slug` — what the player polls before it can mint a grant. */
export interface HostedVideoMeta {
  id: string;
  title?: string;
  status: HostedVideoStatus;
  durationSeconds?: number;
  /** Mounted watch sessions so far — present once the first grant is minted. */
  viewCount?: number;
  qualities: HostedVideoQuality[];
}

/** `POST /videos/:slug/token` — the playback grant, bound to this client's IP. */
export interface StreamGrant {
  token: string;
  assetId: string;
  /** Absolute master-playlist URL with the token already baked in (hls mode). */
  masterUrl: string;
  /** Absolute watch URL in raw mode (un-packaged source streamed by the API). */
  playUrl?: string;
  /** `hls` = encrypted HLS ladder; `raw` = the platform-streamed source file. */
  mode?: 'hls' | 'raw';
  expiresAt: string;
  durationSeconds?: number;
}
