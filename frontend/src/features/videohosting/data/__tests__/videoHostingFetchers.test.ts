import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLessonPlayback,
  fetchVideoMeta,
  mintStreamGrant,
  putLessonProgress,
} from '@/features/videohosting/data/videoHostingFetchers';
import type { LessonProgressResult, StreamGrant } from '@/features/videohosting/types';

const { apiGetMock, apiPostMock, apiRequestMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiRequestMock: vi.fn(),
}));

vi.mock('@/shared/lib/apiClient', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  apiRequest: apiRequestMock,
}));

const grant: StreamGrant = {
  token: 'grant-token',
  assetId: 'asset-1',
  masterUrl: 'https://media.example/master.m3u8',
  expiresAt: '2026-11-02T17:00:00Z',
};

const progressResult: LessonProgressResult = {
  positionSeconds: 42,
  watchedSeconds: 40,
  completed: false,
  completedAt: null,
};

beforeEach(() => {
  apiGetMock.mockReset();
  apiPostMock.mockReset();
  apiRequestMock.mockReset();
});

describe('learner video-hosting fetchers', () => {
  it('posts an uncached lesson playback request with encoded route segments and forwards the signal', async () => {
    apiRequestMock.mockResolvedValue(grant);
    const signal = new AbortController().signal;

    await expect(fetchLessonPlayback('course /intro', 'lesson/1?part=2', signal)).resolves.toBe(grant);

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/courses/course%20%2Fintro/lessons/lesson%2F1%3Fpart%3D2/playback',
      { method: 'POST', cache: 'no-store', signal },
    );
  });

  it('puts the lesson heartbeat as JSON and passes the API result through', async () => {
    const payload = { positionSeconds: 42, durationSeconds: 120, watchedDeltaSeconds: 10 };
    apiRequestMock.mockResolvedValue(progressResult);

    await expect(putLessonProgress('course /intro', 'lesson/1?part=2', payload)).resolves.toBe(progressResult);

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/courses/course%20%2Fintro/lessons/lesson%2F1%3Fpart%3D2/progress',
      { method: 'PUT', body: JSON.stringify(payload) },
    );
  });

  it('sets keepalive on progress writes for visibilitychange and pagehide', async () => {
    const payload = { positionSeconds: 120, durationSeconds: 120, watchedDeltaSeconds: 8 };
    apiRequestMock.mockResolvedValue(progressResult);

    await putLessonProgress('course-slug', 'lesson-id', payload, { keepalive: true });

    expect(apiRequestMock).toHaveBeenCalledWith('/courses/course-slug/lessons/lesson-id/progress', {
      method: 'PUT',
      body: JSON.stringify(payload),
      keepalive: true,
    });
  });

  it('keeps the legacy metadata and slug grant fetchers intact', async () => {
    const metadata = { id: 'video-1', status: 'ready', qualities: [] };
    apiGetMock.mockResolvedValue(metadata);
    apiPostMock.mockResolvedValue(grant);

    await expect(fetchVideoMeta('legacy-video')).resolves.toBe(metadata);
    await expect(mintStreamGrant('legacy-video')).resolves.toBe(grant);

    expect(apiGetMock).toHaveBeenCalledWith('/videos/legacy-video');
    expect(apiPostMock).toHaveBeenCalledWith('/videos/legacy-video/token');
  });
});
