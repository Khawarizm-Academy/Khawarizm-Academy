import { useSyncExternalStore, useEffect, useCallback } from 'react';
import { dataCacheManager, serializeKey, type CacheEntry, type CacheOptions } from '../lib/cacheManager';

export interface UseCachedDataOptions<T> extends CacheOptions {
  enabled?: boolean;
  initialData?: T;
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
  } = options;

  const keyString = serializeKey(key);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!enabled) return () => {};
      return dataCacheManager.subscribe(key, () => onStoreChange());
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

  const data = (entry?.data !== undefined ? entry.data : initialData) as T;
  const isLoading = enabled && entry?.data === undefined;
  const isFetching = enabled && (!entry || dataCacheManager.isStale(entry, staleTime));
  const isError = entry?.status === 'error';
  const error = entry?.error || null;

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
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    setData,
  };
}
