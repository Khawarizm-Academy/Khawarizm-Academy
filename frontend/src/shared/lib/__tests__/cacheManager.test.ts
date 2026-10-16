import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dataCacheManager, serializeKey } from '@/shared/lib/cacheManager';

describe('serializeKey', () => {
  it('is stable regardless of object key order', () => {
    expect(serializeKey({ a: 2, b: 1 })).toBe(serializeKey({ b: 1, a: 2 }));
  });

  it('keeps array order significant', () => {
    expect(serializeKey(['admin', 'users'])).not.toBe(serializeKey(['users', 'admin']));
    expect(serializeKey(['admin', 1])).toBe('[admin,1]');
  });

  it('nests like the object it came from', () => {
    expect(serializeKey({ q: { role: 'student' } })).toBe('{"q":{"role":"student"}}');
  });
});

describe('dataCacheManager', () => {
  beforeEach(() => {
    dataCacheManager.clear();
  });

  it('stores and reads an entry back', () => {
    dataCacheManager.set('dashboard', { total: 3 });

    expect(dataCacheManager.get('dashboard')?.data).toEqual({ total: 3 });
    expect(dataCacheManager.isStale(dataCacheManager.get('dashboard')!)).toBe(false);
  });

  it('treats an entry older than the stale window as stale', () => {
    const entry = { data: 1, timestamp: Date.now(), status: 'success' as const, error: null };

    expect(dataCacheManager.isStale(entry)).toBe(false);
    expect(dataCacheManager.isStale({ ...entry, timestamp: 0 })).toBe(true);
  });

  it('invalidates every variant of a list key at once, and leaves other lists alone', () => {
    dataCacheManager.set(['catalog-items', { tab: 'courses' }], [1]);
    dataCacheManager.set(['catalog-items', { tab: 'scholarships' }], [2]);
    dataCacheManager.set('dashboard', 3);

    dataCacheManager.invalidate('catalog-items');

    expect(dataCacheManager.get(['catalog-items', { tab: 'courses' }])).toBeUndefined();
    expect(dataCacheManager.get(['catalog-items', { tab: 'scholarships' }])).toBeUndefined();
    expect(dataCacheManager.get('dashboard')?.data).toBe(3);
  });

  it('runs one fetcher for concurrent readers of the same key', async () => {
    const fetcher = vi.fn(async () => 'payload');

    const [first, second] = await Promise.all([
      dataCacheManager.fetchWithDeduplication(['catalog-items', { tab: 'courses' }], fetcher),
      dataCacheManager.fetchWithDeduplication(['catalog-items', { tab: 'courses' }], fetcher),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first).toBe('payload');
    expect(second).toBe('payload');
    expect(dataCacheManager.get(['catalog-items', { tab: 'courses' }])?.data).toBe('payload');
  });

  it('lets a second reader hit the network once the first one settled', async () => {
    const fetcher = vi.fn(async () => 'payload');

    await dataCacheManager.fetchWithDeduplication('dashboard', fetcher);
    await dataCacheManager.fetchWithDeduplication('dashboard', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('records a failed fetch as an error instead of a value', async () => {
    const failing = vi.fn(async () => {
      throw new Error('boom');
    });

    await expect(dataCacheManager.fetchWithDeduplication('dashboard', failing)).rejects.toThrow('boom');
    expect(dataCacheManager.get('dashboard')?.status).toBe('error');
    expect(dataCacheManager.get('dashboard')?.error?.message).toBe('boom');
  });

  it('keeps subscribers in the loop until they unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = dataCacheManager.subscribe('dashboard', listener);

    dataCacheManager.set('dashboard', 1);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    dataCacheManager.set('dashboard', 2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies only the key that changed', () => {
    const listener = vi.fn();
    dataCacheManager.subscribe('dashboard', listener);

    dataCacheManager.set('catalog-items', [1]);

    expect(listener).not.toHaveBeenCalled();
  });

  it('forgets everything on clear', () => {
    dataCacheManager.set('dashboard', 1);
    dataCacheManager.clear();

    expect(dataCacheManager.get('dashboard')).toBeUndefined();
  });
});
