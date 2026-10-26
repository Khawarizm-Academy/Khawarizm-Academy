/** Video hosting fetchers — the only place the stream endpoints are called. */

import { apiGet, apiPost } from '@/shared/lib/apiClient';
import type { HostedVideoMeta, StreamGrant } from '@/features/videohosting/types';

/** Readiness + rendition ladder; safe to call before signing in. */
export function fetchVideoMeta(slug: string): Promise<HostedVideoMeta> {
  return apiGet<HostedVideoMeta>(`/videos/${slug}`);
}

/** Mint a playback grant; requires a signed-in learner. */
export function mintStreamGrant(slug: string): Promise<StreamGrant> {
  return apiPost<StreamGrant>(`/videos/${slug}/token`);
}
