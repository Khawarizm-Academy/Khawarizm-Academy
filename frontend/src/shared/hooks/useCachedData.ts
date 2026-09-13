import { useSyncExternalStore, useEffect, useCallback, useState } from 'react';
import { dataCacheManager, serializeKey, type CacheEntry, type CacheOptions } from '../lib/cacheManager';

export interface UseCachedDataOptions<T> extends CacheOptions {
  enabled?: boolean;
  initialData?: T;
  /**
   * When a cache miss occurs (new filter/page/tab key) and `keepPreviousData`
   * is true, the last successfully loaded data stays mounted while the new
   * query loads in the background. Skips flashing the Tier 2 skeleton.
   */
  keepPreviousData?: boolean;
}

export interface UseCachedDataResult<T> {
  data: T;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<T | undefined>;
  setData: (data: T) => void;
}

/**
 * Universal SWR data hook for Khawarizm Academy.
 *
 * Uses React's official useSyncExternalStore for tear-free concurrent reading:
 * - If cached & fresh: returns data immediately with isLoading = false (ZERO flicker).
 * - If cached & stale: returns cached data immediately, triggers background revalidation.
 * - If cache miss: sets isLoading = true, triggering Tier 2 section skeleton until resolved.
 */
export function useCachedData<T>(
  key: unknown,
  fetcher: () => Promise<T> | T,
  options: UseCachedDataOptions<T> = {}
): UseCachedDataResult<T> {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    cacheTime = 30 * 60 * 1000,
    initialData,
    keepPreviousData = false,
  } = options;

  const keyString = serializeKey(key);

  // Holds the last successfully resolved data + its key, so a cache miss on a
  // NEW key can keep rendering the previous results while it loads.
  const [lastCommitted, setLastCommitted] = useState<{ key: string; data: T } | null>(null);

  const commitLastCommitted = (entry: CacheEntry) => {
    if (entry.status !== 'success') return;
    setLastCommitted((prev) =>
      prev && prev.data === entry.data ? prev : { key: keyString, data: entry.data as T }
    );
  };

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!enabled) return () => {};
      // Commit latest successful data inside the store-notification callback
      // (never during render) so keepPreviousData stays safe for React Compiler.
      return dataCacheManager.subscribe(key, (entry) => {
        commitLastCommitted(entry);
        onStoreChange();
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, keyString]
  );

  const getSnapshot = useCallback((): CacheEntry<T> | undefined => {
    return enabled ? dataCacheManager.get<T>(key, cacheTime) : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, keyString, cacheTime]);

  const entry = useSyncExternalStore(subscribe, getSnapshot);

  // Auto-fetch if missing or stale
  useEffect(() => {
    if (!enabled) return;
    const current = dataCacheManager.get<T>(key, cacheTime);
    if (!current || dataCacheManager.isStale(current, staleTime)) {
      dataCacheManager.fetchWithDeduplication<T>(key, fetcher).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, keyString, staleTime, cacheTime]);

  const isLoading = enabled && entry?.data === undefined;
  const isFetching = enabled && (!entry || dataCacheManager.isStale(entry, staleTime));
  const isError = entry?.status === 'error';
  const error = entry?.error || null;

  // keepPreviousData: on a cold miss for a NEW key, surface the previous data
  // (isLoading=false, isFetching=true) so only the section shimmer shows.
  const showPrevious =
    keepPreviousData && isLoading && lastCommitted !== null && lastCommitted.key !== keyString;

  const data = showPrevious
    ? (lastCommitted!.data as T)
    : (entry?.data !== undefined ? entry.data : initialData) as T;

  const refetch = useCallback(async () => {
    return dataCacheManager.fetchWithDeduplication<T>(key, fetcher);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyString]);

  const setData = useCallback(
    (newData: T) => {
      dataCacheManager.set(key, newData);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keyString]
  );

  return {
    data,
    isLoading: showPrevious ? false : isLoading,
    isFetching: showPrevious ? true : isFetching,
    isError,
    error,
    refetch,
    setData,
  };
}
