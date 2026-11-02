/** Video hosting fetchers — the only place the stream endpoints are called. */

import { apiGet, apiPost, apiRequest } from '@/shared/lib/apiClient';
import type {
  HostedVideoMeta,
  LessonProgressHeartbeat,
  LessonProgressResult,
  StreamGrant,
} from '@/features/videohosting/types';

/** Readiness + rendition ladder; safe to call before signing in. */
export function fetchVideoMeta(slug: string): Promise<HostedVideoMeta> {
  return apiGet<HostedVideoMeta>(`/videos/${slug}`);
}

/** Mint a playback grant; requires a signed-in learner. */
export function mintStreamGrant(slug: string): Promise<StreamGrant> {
  return apiPost<StreamGrant>(`/videos/${slug}/token`);
}

/**
 * Resolve a lesson's linked asset and mint a short-lived playback grant.
 * The lesson route is intentionally uncached: it is entitlement-checked and
 * includes the learner's current resume position.
 */
export function fetchLessonPlayback(courseSlug: string, lessonId: string, signal?: AbortSignal): Promise<StreamGrant> {
  return apiRequest<StreamGrant>(
    `/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonId)}/playback`,
    { method: 'POST', cache: 'no-store', signal },
  );
}

/** Persist a bounded learner heartbeat; keepalive supports page visibility exits. */
export function putLessonProgress(
  courseSlug: string,
  lessonId: string,
  payload: LessonProgressHeartbeat,
  options: { keepalive?: boolean } = {},
): Promise<LessonProgressResult> {
  return apiRequest<LessonProgressResult>(
    `/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonId)}/progress`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
      ...(options.keepalive === undefined ? {} : { keepalive: options.keepalive }),
    },
  );
}
