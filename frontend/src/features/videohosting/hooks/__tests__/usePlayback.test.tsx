import { act, renderHook, waitFor } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayback } from '@/features/videohosting/hooks/usePlayback';
import type { StreamGrant } from '@/features/videohosting/types';
import type {
  EngineCapabilities,
  EngineEvent,
  PlaybackEngine,
} from '@/features/videohosting/engines/types';
import * as fetchers from '@/features/videohosting/data/videoHostingFetchers';
import * as registry from '@/features/videohosting/engines/registry';

vi.mock('@/features/videohosting/data/videoHostingFetchers', () => ({
  fetchLessonPlayback: vi.fn(),
  putLessonProgress: vi.fn(),
}));

vi.mock('@/features/videohosting/engines/registry', () => ({
  resolveEngineLoader: vi.fn(),
}));

const fetchPlayback = vi.mocked(fetchers.fetchLessonPlayback);
const putProgress = vi.mocked(fetchers.putLessonProgress);
const resolveLoader = vi.mocked(registry.resolveEngineLoader);

const capabilities: EngineCapabilities = {
  speed: true,
  quality: true,
  captions: true,
  pip: false,
  fullscreen: true,
  seek: true,
  airplay: false,
};

class FakeEngine implements PlaybackEngine {
  readonly id = 'hls' as const;
  readonly capabilities = capabilities;
  readonly attaches: Array<{ host: HTMLElement; grant: StreamGrant; options: { startAt: number; autoplay: boolean } }> = [];
  destroyCount = 0;
  private readonly listeners = new Map<EngineEvent['type'], Set<(event: EngineEvent) => void>>();

  async attach(host: HTMLElement, grant: StreamGrant, options: { startAt: number; autoplay: boolean }): Promise<void> {
    this.attaches.push({ host, grant, options });
    this.emit({ type: 'ready' });
  }

  async play(): Promise<void> {
    this.emit({ type: 'state', state: 'playing' });
  }

  pause(): void {
    this.emit({ type: 'state', state: 'paused' });
  }

  seek(seconds: number): void {
    this.emit({ type: 'time', current: seconds, duration: 100, buffered: seconds });
  }

  setRate(): void {}
  setVolume(): void {}
  setMuted(): void {}
  setQuality(): void {}
  setCaptions(): void {}
  getVideoElement(): HTMLVideoElement | null { return null; }
  requestPictureInPicture(): Promise<void> { return Promise.resolve(); }
  requestAirPlay(): Promise<void> { return Promise.resolve(); }

  on<E extends EngineEvent['type']>(type: E, listener: (event: Extract<EngineEvent, { type: E }>) => void): () => void {
    const listeners = this.listeners.get(type) ?? new Set<(event: EngineEvent) => void>();
    listeners.add(listener as unknown as (event: EngineEvent) => void);
    this.listeners.set(type, listeners);
    return () => listeners.delete(listener as unknown as (event: EngineEvent) => void);
  }

  emit(event: EngineEvent): void {
    this.listeners.get(event.type)?.forEach((listener) => listener(event));
  }

  destroy(): void {
    this.destroyCount += 1;
    this.listeners.clear();
  }
}

const grant = (overrides: Partial<StreamGrant> = {}): StreamGrant => ({
  token: 'token-1',
  assetId: 'asset-1',
  mode: 'hls',
  masterUrl: 'https://cdn.example/master.m3u8',
  expiresAt: '2099-01-01T00:00:00Z',
  durationSeconds: 100,
  ...overrides,
});

const makeHostRef = (): RefObject<HTMLElement | null> => ({ current: document.createElement('div') });
const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

let engines: FakeEngine[];

beforeEach(() => {
  engines = [];
  fetchPlayback.mockReset();
  putProgress.mockReset();
  resolveLoader.mockReset();
  fetchPlayback.mockResolvedValue(grant());
  putProgress.mockResolvedValue({ positionSeconds: 0, watchedSeconds: 0, completed: false });
  resolveLoader.mockReturnValue(async () => ({
    createEngine: () => {
      const engine = new FakeEngine();
      engines.push(engine);
      return engine;
    },
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePlayback', () => {
  it('resolves, attaches without autoplay, and mirrors ready/playing/ended states', async () => {
    const hostRef = makeHostRef();
    const { result } = renderHook(() => usePlayback({
      courseSlug: 'course-1', lessonId: 'lesson-1', durationSeconds: 100, hostRef,
    }));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchPlayback).toHaveBeenCalledWith('course-1', 'lesson-1', expect.any(AbortSignal));
    expect(engines[0].attaches[0]).toMatchObject({ host: hostRef.current, options: { startAt: 0, autoplay: false } });

    act(() => engines[0].emit({ type: 'state', state: 'playing' }));
    expect(result.current.status).toBe('playing');
    act(() => engines[0].emit({ type: 'state', state: 'ended' }));
    expect(result.current.status).toBe('ended');
  });

  it('surfaces entitlement and no-video errors with stable codes', async () => {
    fetchPlayback.mockRejectedValueOnce({ status: 403, code: 'not_entitled', message: 'enrollment required' });
    const entitledHostRef = makeHostRef();
    const entitled = renderHook(() => usePlayback({ courseSlug: 'c', lessonId: 'l', hostRef: entitledHostRef }));
    await waitFor(() => expect(entitled.result.current.errorCode).toBe('not_entitled'));
    entitled.unmount();

    fetchPlayback.mockRejectedValueOnce({ status: 409, code: 'no_video', message: 'no linked video' });
    const noVideoHostRef = makeHostRef();
    const noVideo = renderHook(() => usePlayback({ courseSlug: 'c', lessonId: 'l2', hostRef: noVideoHostRef }));
    await waitFor(() => expect(noVideo.result.current.errorCode).toBe('no_video'));
  });

  it('polls not-ready grants with backoff and cancels on lesson change', async () => {
    vi.useFakeTimers();
    fetchPlayback.mockRejectedValueOnce({ status: 409, code: 'not_ready', message: 'processing' }).mockResolvedValueOnce(grant());
    const hostRef = makeHostRef();
    const { result, rerender } = renderHook(
      ({ lessonId }: { lessonId: string }) => usePlayback({ courseSlug: 'c', lessonId, hostRef }),
      { initialProps: { lessonId: 'l1' } },
    );

    await act(async () => {
      await flushPromises();
      vi.advanceTimersByTime(999);
      await flushPromises();
      expect(result.current.status).toBe('loading');
      vi.advanceTimersByTime(1);
      await flushPromises();
    });
    expect(result.current.status).toBe('ready');
    expect(fetchPlayback).toHaveBeenCalledTimes(2);

    const pending = new Promise<StreamGrant>(() => undefined);
    fetchPlayback.mockReturnValueOnce(pending);
    rerender({ lessonId: 'l2' });
    const pendingSignal = fetchPlayback.mock.calls.at(-1)?.[2];
    rerender({ lessonId: 'l3' });
    expect(pendingSignal?.aborted).toBe(true);
  });

  it('caps readiness polling at ten minutes without unbounded timers', async () => {
    vi.useFakeTimers();
    fetchPlayback.mockRejectedValue({ status: 409, code: 'processing', message: 'still processing' });
    const hostRef = makeHostRef();
    const { result } = renderHook(() => usePlayback({ courseSlug: 'c', lessonId: 'l', hostRef }));
    await act(async () => {
      await flushPromises();
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      await flushPromises();
    });
    expect(result.current.errorCode).toBe('not_ready');
    expect(fetchPlayback.mock.calls.length).toBeLessThan(40);
  });

  it('re-mints once for token_invalid, then surfaces the second fatal failure', async () => {
    const first = grant({ token: 'first' });
    const second = grant({ token: 'second' });
    fetchPlayback.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const hostRef = makeHostRef();
    const { result } = renderHook(() => usePlayback({ courseSlug: 'c', lessonId: 'l', hostRef }));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => engines[0].emit({ type: 'error', kind: 'token_invalid', fatal: true, retryable: true, detail: 'expired' }));
    await waitFor(() => expect(engines).toHaveLength(2));
    expect(result.current.errorCode).toBeNull();
    expect(engines[1].attaches[0].options.autoplay).toBe(false);

    act(() => engines[1].emit({ type: 'error', kind: 'token_invalid', fatal: true, retryable: true, detail: 'expired again' }));
    await waitFor(() => expect(result.current.errorCode).toBe('token_invalid'));
    expect(fetchPlayback).toHaveBeenCalledTimes(2);
  });

  it('re-mints a raw grant once after a fatal media network error', async () => {
    const first = grant({ token: 'raw-old', mode: 'raw', masterUrl: undefined, playUrl: 'https://api.example/raw?token=old' });
    const second = grant({ token: 'raw-new', mode: 'raw', masterUrl: undefined, playUrl: 'https://api.example/raw?token=new' });
    fetchPlayback.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const hostRef = makeHostRef();
    const { result } = renderHook(() => usePlayback({ courseSlug: 'c', lessonId: 'l', hostRef }));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => engines[0].emit({ type: 'error', kind: 'network', fatal: true, retryable: true, detail: 'media request failed' }));
    await waitFor(() => expect(engines).toHaveLength(2));
    expect(engines[1].attaches[0].grant.token).toBe('raw-new');
    expect(result.current.errorCode).toBeNull();

    act(() => engines[1].emit({ type: 'error', kind: 'network', fatal: true, retryable: true, detail: 'media request failed again' }));
    await waitFor(() => expect(result.current.errorCode).toBe('network'));
    expect(fetchPlayback).toHaveBeenCalledTimes(2);
  });

  it('applies resume boundaries and provides a six-second start-over prompt', async () => {
    vi.useFakeTimers();
    fetchPlayback.mockResolvedValueOnce(grant({ resumeAt: 30 }));
    const hostRef = makeHostRef();
    const hook = renderHook(() => usePlayback({ courseSlug: 'c', lessonId: 'l', durationSeconds: 100, hostRef }));
    await act(async () => { await flushPromises(); });
    expect(hook.result.current.showResumePrompt).toBe(true);
    expect(hook.result.current.resumeAt).toBe(30);
    expect(engines[0].attaches[0].options.startAt).toBe(30);

    act(() => hook.result.current.startFromBeginning());
    expect(hook.result.current.resumeAt).toBe(0);
    expect(hook.result.current.showResumePrompt).toBe(false);
    expect(engines[0].attaches[0].options.startAt).toBe(30);
    vi.advanceTimersByTime(6_000);
    expect(hook.result.current.showResumePrompt).toBe(false);
    hook.unmount();

    fetchPlayback.mockResolvedValueOnce(grant({ resumeAt: 9 }));
    const belowBoundaryHostRef = makeHostRef();
    const belowBoundary = renderHook(() => usePlayback({ courseSlug: 'c', lessonId: 'l2', durationSeconds: 100, hostRef: belowBoundaryHostRef }));
    await act(async () => { await flushPromises(); });
    expect(belowBoundary.result.current.resumeAt).toBe(0);
  });

  it('sends wall-time heartbeats, clamps delta, skips unchanged data, and retries failures', async () => {
    vi.useFakeTimers();
    const hostRef = makeHostRef();
    const { result } = renderHook(() => usePlayback({ courseSlug: 'c', lessonId: 'l', durationSeconds: 100, hostRef }));
    await act(async () => { await flushPromises(); });
    expect(result.current.status).toBe('ready');

    act(() => {
      engines[0].emit({ type: 'state', state: 'playing' });
      engines[0].emit({ type: 'time', current: 20, duration: 100, buffered: 40 });
      vi.advanceTimersByTime(15_000);
    });
    await flushPromises();
    expect(putProgress).toHaveBeenCalledWith('c', 'l', {
      positionSeconds: 20, durationSeconds: 100, watchedDeltaSeconds: 15,
    }, {});

    putProgress.mockClear();
    await act(async () => { await result.current.flushProgress(); });
    await act(async () => { await result.current.flushProgress(); });
    expect(putProgress.mock.calls.length).toBe(1);

    act(() => vi.advanceTimersByTime(60_000));
    await flushPromises();
    const latestPayload = putProgress.mock.calls.at(-1)?.[2];
    expect(latestPayload?.watchedDeltaSeconds).toBeLessThanOrEqual(45);

    putProgress.mockRejectedValueOnce(new Error('offline'));
    act(() => engines[0].emit({ type: 'time', current: 55, duration: 100, buffered: 60 }));
    await act(async () => { await result.current.flushProgress(); });
    const failedCount = putProgress.mock.calls.length;
    putProgress.mockResolvedValueOnce({ positionSeconds: 55, watchedSeconds: 55, completed: false });
    await act(async () => { await result.current.flushProgress(); });
    expect(putProgress.mock.calls.length).toBeGreaterThan(failedCount);
  });

  it('flushes hidden progress with keepalive and destroys engine/listeners/timers on cleanup', async () => {
    vi.useFakeTimers();
    const hostRef = makeHostRef();
    const { result, unmount } = renderHook(() => usePlayback({ courseSlug: 'c', lessonId: 'l', hostRef }));
    await act(async () => { await flushPromises(); });
    expect(result.current.status).toBe('ready');
    act(() => {
      engines[0].emit({ type: 'state', state: 'playing' });
      engines[0].emit({ type: 'time', current: 12, duration: 100, buffered: 20 });
    });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await flushPromises();
    });
    expect(putProgress).toHaveBeenCalledWith('c', 'l', expect.objectContaining({ positionSeconds: 12 }), { keepalive: true });
    unmount();
    expect(engines[0].destroyCount).toBe(1);
    expect(hostRef.current?.childElementCount).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(putProgress).toHaveBeenCalledTimes(1);
  });

  it('flushes the latest lesson position with keepalive when the lesson changes/unmounts', async () => {
    const hostRef = makeHostRef();
    const { unmount } = renderHook(() => usePlayback({ courseSlug: 'c', lessonId: 'l', hostRef }));
    await waitFor(() => expect(engines).toHaveLength(1));
    act(() => engines[0].emit({ type: 'time', current: 37, duration: 100, buffered: 40 }));
    await act(async () => {
      unmount();
      await flushPromises();
    });
    expect(putProgress).toHaveBeenCalledWith('c', 'l', {
      positionSeconds: 37,
      durationSeconds: 100,
      watchedDeltaSeconds: 0,
    }, { keepalive: true });
  });
});
