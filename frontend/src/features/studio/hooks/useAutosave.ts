import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/shared/lib/apiClient';

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'offline';
export function useAutosave<T extends Record<string, unknown>>(
  save: (payload: T) => Promise<unknown>,
  initialExpectedUpdatedAt?: string,
) {
  const [state, setState] = useState<SaveState>('idle');
  const [conflict, setConflict] = useState<ApiError | null>(null);
  const expectedRef = useRef(initialExpectedUpdatedAt);
  const pendingRef = useRef<T | null>(null);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const offlineQueueRef = useRef<T[]>([]);
  const run = useCallback(async () => {
    if (inFlightRef.current || !pendingRef.current) return;
    if (!navigator.onLine) {
      offlineQueueRef.current.push(pendingRef.current);
      pendingRef.current = null;
      setState('offline');
      return;
    }
    const payload = { ...pendingRef.current, ...(expectedRef.current ? { expectedUpdatedAt: expectedRef.current } : {}) } as T;
    pendingRef.current = null;
    inFlightRef.current = true;
    setState('saving');
    try {
      const result = await save(payload);
      const updatedAt = (result as { updatedAt?: string } | undefined)?.updatedAt;
      if (updatedAt) expectedRef.current = updatedAt;
      setState('saved');
      setConflict(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConflict(error);
      setState('error');
      if (error instanceof TypeError) offlineQueueRef.current.push(payload);
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current) void run();
    }
  }, [save]);
  const queue = useCallback((payload: T) => {
    pendingRef.current = { ...(pendingRef.current || {}), ...payload } as T;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void run(), 700);
    setState('saving');
  }, [run]);
  const retryOffline = useCallback(() => {
    const queued = offlineQueueRef.current.pop();
    if (queued) pendingRef.current = { ...(pendingRef.current || {}), ...queued } as T;
    void run();
  }, [run]);
  useEffect(() => {
    const onOnline = () => retryOffline();
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [retryOffline]);
  return { state, conflict, queue, retryOffline, clearConflict: () => setConflict(null), expectedUpdatedAt: expectedRef.current };
}
