import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/shared/lib/apiClient';

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'offline';
export type ConflictChoice = 'mine' | 'theirs';

export interface AutosaveConflictDetails<T extends Record<string, unknown>> {
  error: ApiError;
  local: T;
  server: Record<string, unknown>;
}

export interface AutosaveResolution<T extends Record<string, unknown>> {
  local: T;
  server: Record<string, unknown>;
  choices: Record<string, ConflictChoice>;
}

function serverValues(error: ApiError): Record<string, unknown> {
  const current = error.fields?.current;
  return current && typeof current === 'object' ? current as Record<string, unknown> : {};
}

export function useAutosave<T extends Record<string, unknown>>(
  save: (payload: T) => Promise<unknown>,
  initialExpectedUpdatedAt?: string,
) {
  const [state, setState] = useState<SaveState>('idle');
  const [conflict, setConflict] = useState<ApiError | null>(null);
  const [conflictDetails, setConflictDetails] = useState<AutosaveConflictDetails<T> | null>(null);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(initialExpectedUpdatedAt);
  const expectedRef = useRef(initialExpectedUpdatedAt);
  const pendingRef = useRef<T | null>(null);
  const conflictRef = useRef<AutosaveConflictDetails<T> | null>(null);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const offlineQueueRef = useRef<T[]>([]);
  const runRef = useRef<() => Promise<void>>(async () => undefined);

  const run = useCallback(async () => {
    if (inFlightRef.current || !pendingRef.current || conflictRef.current) return;
    if (!navigator.onLine) {
      offlineQueueRef.current.push(pendingRef.current);
      pendingRef.current = null;
      setState('offline');
      return;
    }
    const payload = {
      ...pendingRef.current,
      ...(expectedRef.current ? { expectedUpdatedAt: expectedRef.current } : {}),
    } as T;
    pendingRef.current = null;
    inFlightRef.current = true;
    setState('saving');
    try {
      const result = await save(payload);
      const updatedAt = (result as { updatedAt?: string } | undefined)?.updatedAt;
      if (updatedAt) {
        expectedRef.current = updatedAt;
        setExpectedUpdatedAt(updatedAt);
      }
      setState('saved');
      setConflict(null);
      conflictRef.current = null;
      setConflictDetails(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const details: AutosaveConflictDetails<T> = {
          error,
          local: payload,
          server: serverValues(error),
        };
        conflictRef.current = details;
        setConflictDetails(details);
        setConflict(error);
      } else if (error instanceof TypeError) {
        offlineQueueRef.current.push(payload);
      }
      setState('error');
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current && !conflictRef.current) void runRef.current();
    }
  }, [save]);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const queue = useCallback((payload: T) => {
    pendingRef.current = { ...(pendingRef.current || {}), ...payload } as T;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void runRef.current(), 700);
    setState('saving');
  }, []);

  const resolveConflict = useCallback((choices: Record<string, ConflictChoice>): AutosaveResolution<T> | null => {
    const details = conflictRef.current;
    if (!details) return null;
    const nextPayload = Object.entries(details.local).reduce<Record<string, unknown>>((payload, [key, value]) => {
      if (key !== 'expectedUpdatedAt' && (choices[key] ?? 'mine') === 'mine') payload[key] = value;
      return payload;
    }, {});
    const serverVersion = details.server.updatedAt;
    if (typeof serverVersion === 'string') {
      expectedRef.current = serverVersion;
      setExpectedUpdatedAt(serverVersion);
    }
    conflictRef.current = null;
    setConflictDetails(null);
    setConflict(null);
    pendingRef.current = Object.keys(nextPayload).length ? nextPayload as T : null;
    if (pendingRef.current) {
      setState('saving');
      void runRef.current();
    } else {
      setState('saved');
    }
    return { local: details.local, server: details.server, choices };
  }, []);

  const retryOffline = useCallback(() => {
    const queued = offlineQueueRef.current.splice(0);
    if (queued.length) {
      pendingRef.current = queued.reduce<T | null>(
        (merged, payload) => ({ ...(merged || {}), ...payload } as T),
        pendingRef.current,
      );
    }
    if (pendingRef.current) void runRef.current();
  }, []);

  useEffect(() => {
    const onOnline = () => retryOffline();
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [retryOffline]);

  return {
    state,
    conflict,
    conflictDetails,
    queue,
    retryOffline,
    resolveConflict,
    clearConflict: () => {
      conflictRef.current = null;
      setConflict(null);
      setConflictDetails(null);
    },
    expectedUpdatedAt,
  };
}
