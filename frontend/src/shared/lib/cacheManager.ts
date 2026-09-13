/**
 * Khawarizm Academy — Master In-Memory & SWR Data Cache Manager
 *
 * Provides deterministic key serialization, Stale-While-Revalidate (SWR) semantics,
 * background revalidation, subscriber notifications, and memory TTL eviction.
 */

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  status: 'loading' | 'success' | 'error';
  error?: Error | null;
}

export interface CacheOptions {
  staleTime?: number; // Time in ms before data is considered stale (default 5 min)
  cacheTime?: number; // Time in ms before memory is evicted (default 30 min)
}

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CACHE_TIME = 30 * 60 * 1000; // 30 minutes

export function serializeKey(key: unknown): string {
  if (typeof key === 'string') return key;
  if (typeof key === 'number' || typeof key === 'boolean') return String(key);
  if (Array.isArray(key)) {
    return `[${key.map(serializeKey).join(',')}]`;
  }
  if (key && typeof key === 'object') {
    // Sort keys deterministically to avoid hash mismatches
    const sorted = Object.keys(key as Record<string, unknown>)
      .sort()
      .reduce((acc, k) => {
        acc[k] = (key as Record<string, unknown>)[k];
        return acc;
      }, {} as Record<string, unknown>);
    return JSON.stringify(sorted);
  }
  return String(key);
}

class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private listeners = new Map<string, Set<(entry: CacheEntry) => void>>();
  private inFlightRequests = new Map<string, Promise<unknown>>();

  /**
   * Retrieves a cache entry if available and not evicted by cacheTime
   */
  get<T>(rawKey: unknown, cacheTime = DEFAULT_CACHE_TIME): CacheEntry<T> | undefined {
    const key = serializeKey(rawKey);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;

    const age = Date.now() - entry.timestamp;
    if (age > cacheTime) {
      this.cache.delete(key);
      return undefined;
    }

    return entry;
  }

  /**
   * Checks if a cached entry is stale based on staleTime
   */
  isStale(entry: CacheEntry, staleTime = DEFAULT_STALE_TIME): boolean {
    return Date.now() - entry.timestamp > staleTime;
  }

  /**
   * Writes data into the cache and broadcasts to all active subscribers
   */
  set<T>(rawKey: unknown, data: T): void {
    const key = serializeKey(rawKey);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      status: 'success',
      error: null,
    };
    this.cache.set(key, entry as CacheEntry);
    this.notify(key, entry as CacheEntry);
  }

  /**
   * Marks specific or wildcard matching keys as stale.
   *
   * Accepts a partial key (string, array, or object). Any cached entry whose
   * leading namespace token matches is invalidated — e.g. `invalidate('catalog-items')`
   * clears every `['catalog-items', {…filters}]` variant.
   */
  invalidate(rawKey: unknown): void {
    const prefix = serializeKey(rawKey).replace(/^\[/, '').split(/[,}\]]/)[0].trim();
    if (!prefix) return;

    for (const [key, entry] of this.cache.entries()) {
      const keyToken = key.replace(/^\[/, '').split(/[,}\]]/)[0].trim();
      if (keyToken === prefix) {
        entry.timestamp = 0; // Force immediate staleness
        this.notify(key, entry);
      }
    }
  }

  /**
   * Subscribes a listener to updates for a specific key
   */
  subscribe(rawKey: unknown, listener: (entry: CacheEntry) => void): () => void {
    const key = serializeKey(rawKey);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  private notify(key: string, entry: CacheEntry): void {
    const set = this.listeners.get(key);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(entry);
        } catch (e) {
          console.error('[CacheManager] Error in listener:', e);
        }
      });
    }
  }

  /**
   * Deduplicates concurrent fetch calls and caches the resolved result
   */
  async fetchWithDeduplication<T>(
    rawKey: unknown,
    fetcher: () => Promise<T> | T
  ): Promise<T> {
    const key = serializeKey(rawKey);

    // Return in-flight request if already pending
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        this.set(key, result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const entry: CacheEntry = {
          data: this.cache.get(key)?.data,
          timestamp: Date.now(),
          status: 'error',
          error,
        };
        this.cache.set(key, entry);
        this.notify(key, entry);
        throw error;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  /**
   * Pre-loads data into cache in the background (e.g. on link hover)
   */
  async prefetch<T>(rawKey: unknown, fetcher: () => Promise<T> | T, staleTime = DEFAULT_STALE_TIME): Promise<void> {
    const entry = this.get<T>(rawKey);
    if (entry && !this.isStale(entry, staleTime)) {
      return; // Already cached and fresh
    }
    await this.fetchWithDeduplication(rawKey, fetcher);
  }

  /**
   * Clears the entire cache (e.g. on logout)
   */
  clear(): void {
    this.cache.clear();
    this.inFlightRequests.clear();
  }
}

export const dataCacheManager = new CacheManager();
