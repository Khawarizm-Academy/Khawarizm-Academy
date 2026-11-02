import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { playerCopy } from '@/features/videohosting/data/playerCopy';

export interface UpNextCardProps {
  title: string;
  onAdvance: () => void;
  /** Legacy aliases retained for callers migrating from the earlier draft API. */
  nextTitle?: string;
  onContinue?: () => void;
  onPlayNext?: () => void;
  onCancel: () => void;
  durationSeconds?: number;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function secondsRemaining(target: number): { seconds: number; milliseconds: number } {
  const milliseconds = Math.max(0, target - Date.now());
  return { milliseconds, seconds: Math.max(0, Math.ceil(milliseconds / 1000)) };
}

/** A five-second next-lesson handoff driven by an absolute target timestamp. */
export function UpNextCard({
  title,
  onAdvance,
  nextTitle,
  onContinue,
  onPlayNext,
  onCancel,
  durationSeconds = 5,
}: UpNextCardProps) {
  const durationMs = Math.max(1, durationSeconds * 1000);
  const continueRef = useRef(onAdvance ?? onContinue ?? onPlayNext);
  const cancelRef = useRef(onCancel);
  const targetRef = useRef(0);
  const pausedRemainingRef = useRef(durationMs);
  const intervalRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const cancelledRef = useRef(false);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.ceil(durationMs / 1000));
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    continueRef.current = onAdvance ?? onContinue ?? onPlayNext;
  }, [onAdvance, onContinue, onPlayNext]);

  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const mediaQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    if (!mediaQuery) return undefined;
    const onChange = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener?.('change', onChange);
    return () => mediaQuery.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    let mounted = true;
    targetRef.current = Date.now() + durationMs;
    const clearTick = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const finish = () => {
      clearTick();
      if (!mounted || cancelledRef.current || completedRef.current) return;
      completedRef.current = true;
      setRemainingMs(0);
      setRemainingSeconds(0);
      continueRef.current?.();
    };

    const tick = () => {
      const next = secondsRemaining(targetRef.current);
      if (next.milliseconds <= 0) {
        finish();
        return;
      }
      setRemainingMs(next.milliseconds);
      setRemainingSeconds(next.seconds);
    };

    const start = () => {
      if (!mounted || cancelledRef.current || completedRef.current || document.hidden) return;
      targetRef.current = Date.now() + pausedRemainingRef.current;
      tick();
      clearTick();
      intervalRef.current = window.setInterval(tick, 100);
    };

    const pause = () => {
      if (completedRef.current || cancelledRef.current) return;
      pausedRemainingRef.current = Math.max(0, targetRef.current - Date.now());
      clearTick();
      setRemainingMs(pausedRemainingRef.current);
      setRemainingSeconds(Math.max(0, Math.ceil(pausedRemainingRef.current / 1000)));
    };

    const onVisibilityChange = () => {
      if (document.hidden) pause();
      else start();
    };

    if (document.hidden) pause();
    else start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      clearTick();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [durationMs]);

  const cancel = () => {
    cancelledRef.current = true;
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    cancelRef.current();
  };

  const progress = Math.min(100, Math.max(0, ((durationMs - remainingMs) / durationMs) * 100));
  const progressStyle = { '--player-progress': `${progress}%` } as CSSProperties;

  return (
    <aside className="player-up-next-card" aria-labelledby="player-up-next-title">
      <div className="player-up-next-copy">
        <p className="player-up-next-eyebrow" id="player-up-next-title">{playerCopy.upNextHeading}</p>
        <h2 className="player-up-next-title">{title ?? nextTitle}</h2>
        <p className="player-up-next-status" role="status" aria-live="polite">
          {playerCopy.upNextStartsIn}{' '}
          <bdi dir="ltr">{remainingSeconds}</bdi>
        </p>
      </div>
      <div
        className={reducedMotion ? 'player-up-next-progress player-up-next-progress-static' : 'player-up-next-progress player-up-next-progress-ring'}
        role="progressbar"
        aria-label={playerCopy.upNextStartsIn}
        aria-valuemin={0}
        aria-valuemax={durationSeconds}
        aria-valuenow={remainingSeconds}
        style={progressStyle}
      />
      <button type="button" className="player-up-next-cancel" onClick={cancel}>
        {playerCopy.upNextCancel}
      </button>
    </aside>
  );
}

export default UpNextCard;
