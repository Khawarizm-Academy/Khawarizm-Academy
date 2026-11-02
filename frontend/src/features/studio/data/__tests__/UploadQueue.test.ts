import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  UploadQueue,
  etaSeconds,
  rollingSpeed,
  sha256FirstChunk,
  validateUploadFile,
  type UploadQueueOptions,
  type UploadTransport,
} from '@/features/studio/data/uploader/UploadQueue';

type Session = {
  fileName: string;
  total: number;
  chunkSize: number;
  offset: number;
  firstChunkSha256: string;
};

type TransportOptions = {
  chunkSize?: number;
};

const queues: UploadQueue[] = [];

function makeFile(bytes: number[], name = 'lesson.mp4', type = 'video/mp4'): File {
  return new File([Uint8Array.from(bytes)], name, { type });
}

async function makeTransport(file: File, options: TransportOptions = {}) {
  const chunkSize = options.chunkSize ?? file.size;
  const firstChunkSha256 = await sha256FirstChunk(file, chunkSize);
  const sessions = new Map<string, Session>();
  const transport = {
    init: vi.fn(async (assetId: string, input: { fileName: string; sizeBytes: number; mimeType: string; firstChunkSha256: string; packaging?: string }) => {
      const sessionId = `session-${assetId}`;
      void input;
      sessions.set(sessionId, { fileName: file.name, total: file.size, chunkSize, offset: 0, firstChunkSha256 });
      return { sessionId, chunkSize, offset: 0, total: file.size };
    }),
    status: vi.fn(async (sessionId: string) => {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`unknown session ${sessionId}`);
      return { ...session };
    }),
    chunk: vi.fn(async (sessionId: string, _body: Blob, _start: number, end: number) => {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`unknown session ${sessionId}`);
      session.offset = end + 1;
      return { offset: session.offset, complete: session.offset === session.total };
    }),
    complete: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
  } satisfies UploadTransport;
  return { transport, sessions };
}

function createQueue(options: Omit<UploadQueueOptions, 'transport'> & { transport: UploadTransport }): UploadQueue {
  const queue = new UploadQueue(options);
  queues.push(queue);
  return queue;
}

async function waitForState(queue: UploadQueue, id: string, state: string): Promise<void> {
  await vi.waitFor(() => expect(queue.list().find((job) => job.id === id)?.state).toBe(state));
}

function chunkCalls(transport: { chunk: ReturnType<typeof vi.fn> }) {
  return transport.chunk.mock.calls as Array<[string, Blob, number, number, number]>;
}

afterEach(() => {
  queues.splice(0).forEach((queue) => queue.destroy());
  vi.restoreAllMocks();
});

describe('UploadQueue', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('initializes, chunks in order, reports packaging and duration, then completes', async () => {
    const file = makeFile([0, 1, 2, 3, 4, 5, 6]);
    const { transport } = await makeTransport(file, { chunkSize: 3 });
    const queue = createQueue({ transport, now: () => 1_000, sleep: async () => undefined });

    const id = queue.add(file, 'asset-1', { packaging: 'force', durationSeconds: 321 });
    await waitForState(queue, id, 'done');

    expect(transport.init).toHaveBeenCalledWith('asset-1', expect.objectContaining({
      fileName: 'lesson.mp4',
      sizeBytes: 7,
      mimeType: 'video/mp4',
      packaging: 'force',
      firstChunkSha256: expect.any(String),
    }));
    expect(chunkCalls(transport).map(([, , start, end, total]) => ({ start, end, total }))).toEqual([
      { start: 0, end: 2, total: 7 },
      { start: 3, end: 5, total: 7 },
      { start: 6, end: 6, total: 7 },
    ]);
    expect(transport.complete).toHaveBeenCalledWith('session-asset-1', 321);
    expect(queue.list()[0]).toMatchObject({ offset: 7, percent: 100, state: 'done', speed: 0, etaSeconds: 0 });
  });

  it('adopts the server offset after a 409 instead of re-sending the rejected range', async () => {
    const file = makeFile([10, 11, 12, 13, 14, 15]);
    const { transport, sessions } = await makeTransport(file, { chunkSize: 3 });
    transport.chunk.mockImplementationOnce(async (sessionId: string) => {
      sessions.get(sessionId)!.offset = 3;
      throw { status: 409, code: 'offset_mismatch' };
    });
    const queue = createQueue({ transport, now: () => 1_000, sleep: async () => undefined });

    const id = queue.add(file, 'asset-offset');
    await waitForState(queue, id, 'done');

    expect(chunkCalls(transport).map(([, , start, end]) => ({ start, end }))).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 5 },
    ]);
    expect(transport.status).toHaveBeenCalledTimes(2);
    expect(queue.list()[0]).toMatchObject({ offset: 6, percent: 100, state: 'done' });
  });

  it('retries transient failures with deterministic exponential backoff and honors Retry-After', async () => {
    const file = makeFile([1, 2, 3]);
    const { transport } = await makeTransport(file);
    transport.chunk
      .mockImplementationOnce(async () => { throw { status: 503, message: 'temporary outage' }; })
      .mockImplementationOnce(async () => { throw { status: 429, retryAfter: 2, message: 'slow down' }; });
    const sleep = vi.fn(async () => undefined);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const queue = createQueue({ transport, sleep });

    const id = queue.add(file, 'asset-retry');
    await waitForState(queue, id, 'done');

    expect(sleep).toHaveBeenNthCalledWith(1, 500);
    expect(sleep).toHaveBeenNthCalledWith(2, 2_000);
    expect(transport.chunk).toHaveBeenCalledTimes(3);
    expect(queue.list()[0]).toMatchObject({ retries: 0, state: 'done' });
  });

  it('pauses an in-flight job and resumes from the confirmed server offset', async () => {
    const file = makeFile([20, 21, 22, 23, 24, 25]);
    const { transport, sessions } = await makeTransport(file, { chunkSize: 3 });
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    transport.chunk.mockImplementationOnce(async (sessionId: string) => {
      await blocked;
      sessions.get(sessionId)!.offset = 3;
      return { offset: 3, complete: false };
    });
    const states: string[] = [];
    const queue = createQueue({ transport, onChange: (jobs) => { if (jobs[0]) states.push(jobs[0].state); } });

    const id = queue.add(file, 'asset-pause');
    await vi.waitFor(() => expect(queue.list()[0]?.state).toBe('uploading'));
    queue.pause(id);
    expect(queue.list()[0]).toMatchObject({ state: 'paused' });
    const pausedEmissions = states.filter((state) => state === 'paused').length;
    release();
    await vi.waitFor(() => expect(states.filter((state) => state === 'paused').length).toBeGreaterThan(pausedEmissions));

    queue.resume(id);
    await waitForState(queue, id, 'done');
    expect(chunkCalls(transport).map(([, , start]) => start)).toEqual([0, 3]);
  });

  it('pauses automatically while offline and resumes automatically when connectivity returns', async () => {
    const file = makeFile([30, 31, 32]);
    const { transport, sessions } = await makeTransport(file);
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    transport.chunk.mockImplementationOnce(async (sessionId: string) => {
      await blocked;
      sessions.get(sessionId)!.offset = 3;
      return { offset: 3, complete: true };
    });
    const states: string[] = [];
    const queue = createQueue({ transport, onChange: (jobs) => { if (jobs[0]) states.push(jobs[0].state); } });

    const id = queue.add(file, 'asset-offline');
    await vi.waitFor(() => expect(queue.list()[0]?.state).toBe('uploading'));
    window.dispatchEvent(new Event('offline'));
    expect(queue.list()[0]).toMatchObject({ state: 'paused', error: 'لا يوجد اتصال — أوقفنا الرفع مؤقتًا.' });
    const pausedEmissions = states.filter((state) => state === 'paused').length;
    release();
    await vi.waitFor(() => expect(states.filter((state) => state === 'paused').length).toBeGreaterThan(pausedEmissions));

    window.dispatchEvent(new Event('online'));
    await waitForState(queue, id, 'done');
    expect(transport.complete).toHaveBeenCalledWith('session-asset-offline', undefined);
  });

  it('cancels a queued resumable session through the transport without starting a chunk', async () => {
    const first = makeFile([40, 41, 42]);
    const second = makeFile([50, 51, 52], 'second.mp4');
    const { transport } = await makeTransport(first);
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    transport.chunk.mockImplementationOnce(async () => {
      await blocked;
      return { offset: first.size, complete: true };
    });
    const queue = createQueue({ transport, maxConcurrent: 1 });

    const firstId = queue.add(first, 'asset-first');
    await vi.waitFor(() => expect(queue.list().find((job) => job.id === firstId)?.state).toBe('uploading'));
    const secondId = queue.resumeExisting(second, 'asset-second', {
      sessionId: 'existing-session',
      fileName: second.name,
      total: second.size,
      chunkSize: second.size,
      offset: 0,
      firstChunkSha256: await sha256FirstChunk(second),
    });
    await queue.cancel(secondId);

    expect(queue.list().find((job) => job.id === secondId)).toMatchObject({ state: 'cancelled' });
    expect(transport.cancel).toHaveBeenCalledWith('existing-session');
    expect(chunkCalls(transport).every(([, , , , total]) => total === first.size)).toBe(true);
    release();
    await waitForState(queue, firstId, 'done');
  });

  it('enforces the concurrency cap and keeps at most one chunk in flight per file', async () => {
    const files = [
      makeFile([60, 61, 62], 'one.mp4'),
      makeFile([70, 71, 72], 'two.mp4'),
      makeFile([80, 81, 82], 'three.mp4'),
    ];
    const { transport, sessions } = await makeTransport(files[0]);
    const sessionFiles = new Map<string, File>();
    transport.init.mockImplementation(async (assetId: string) => {
      const file = files.find((candidate) => assetId === `asset-${candidate.name}`)!;
      const sessionId = `session-${assetId}`;
      sessionFiles.set(sessionId, file);
      sessions.set(sessionId, { fileName: file.name, total: file.size, chunkSize: file.size, offset: 0, firstChunkSha256: await sha256FirstChunk(file) });
      return { sessionId, chunkSize: file.size, offset: 0, total: file.size };
    });
    const releases = new Map<string, () => void>();
    const inFlight = new Set<string>();
    let maxInFlight = 0;
    transport.chunk.mockImplementation((sessionId: string, _body: Blob, _start: number, end: number) => new Promise((resolve) => {
      inFlight.add(sessionId);
      maxInFlight = Math.max(maxInFlight, inFlight.size);
      releases.set(sessionId, () => {
        sessions.get(sessionId)!.offset = end + 1;
        inFlight.delete(sessionId);
        resolve({ offset: end + 1, complete: end + 1 === sessions.get(sessionId)!.total });
      });
    }));
    const queue = createQueue({ transport, maxConcurrent: 2 });
    const ids = files.map((file) => queue.add(file, `asset-${file.name}`));

    await vi.waitFor(() => expect(transport.chunk).toHaveBeenCalledTimes(2));
    expect(maxInFlight).toBe(2);
    expect(releases.size).toBe(2);
    const firstTwoSessions = [...releases.keys()];
    releases.get(firstTwoSessions[0])!();
    await vi.waitFor(() => expect(transport.chunk).toHaveBeenCalledTimes(3));
    expect(maxInFlight).toBe(2);
    releases.forEach((release, sessionId) => {
      if (sessionId !== firstTwoSessions[0]) release();
    });
    await vi.waitFor(() => expect(releases.size).toBe(3));
    releases.get('session-asset-three.mp4')!();
    await Promise.all(ids.map((id) => waitForState(queue, id, 'done')));
    expect(maxInFlight).toBe(2);
  });

  it('rejects a wrong resumed file by first-chunk fingerprint before any PUT', async () => {
    const original = makeFile([90, 91, 92, 93], 'same-name.mp4');
    const wrong = makeFile([90, 99, 92, 93], 'same-name.mp4');
    const { transport } = await makeTransport(original, { chunkSize: 2 });
    transport.status.mockResolvedValue({
      offset: 2,
      total: wrong.size,
      chunkSize: 2,
      fileName: wrong.name,
      firstChunkSha256: await sha256FirstChunk(original, 2),
    });
    const queue = createQueue({ transport });

    const id = queue.resumeExisting(wrong, 'asset-resume', {
      sessionId: 'existing-session',
      fileName: wrong.name,
      total: wrong.size,
      chunkSize: 2,
      offset: 2,
      firstChunkSha256: await sha256FirstChunk(original, 2),
    });
    await waitForState(queue, id, 'failed');

    expect(transport.chunk).not.toHaveBeenCalled();
    expect(queue.list()[0]?.error).toContain(' بصمة المقطع الأول');
  });
});

describe('UploadQueue math and validation helpers', () => {
  it('calculates a five-second rolling speed and ETA while ignoring stale samples', () => {
    expect(rollingSpeed([
      { at: 1_000, bytes: 0 },
      { at: 2_000, bytes: 1_000 },
      { at: 7_000, bytes: 5_000 },
    ], 7_000)).toBe(800);
    expect(etaSeconds(1_500, 5_000, 800)).toBe(5);
    expect(rollingSpeed([{ at: 1_000, bytes: 0 }], 1_000)).toBe(0);
    expect(etaSeconds(1_500, 5_000, 0)).toBeNull();
  });

  it('rejects unsupported, empty, oversized, and over-quota files before upload', () => {
    expect(validateUploadFile(makeFile([1], 'lesson.avi'), 10, 10)).toContain('صيغة الفيديو غير مدعومة');
    expect(validateUploadFile(makeFile([], 'lesson.mp4'), 10, 10)).toContain('حجم الفيديو يتجاوز');
    expect(validateUploadFile(makeFile([1, 2, 3], 'lesson.mp4'), 2, 10)).toContain('حجم الفيديو يتجاوز');
    expect(validateUploadFile(makeFile([1, 2, 3], 'lesson.mp4'), 10, 2)).toContain('الحصة المتبقية');
    expect(validateUploadFile(makeFile([1, 2, 3], 'lesson.WEBM'), 10, 3)).toBeNull();
  });
});
