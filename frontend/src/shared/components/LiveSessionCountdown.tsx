import React, { useEffect, useMemo, useState } from 'react';

interface LiveSessionCountdownProps {
  startsAt: string | null;
  serverNow?: string;
  serverOffsetMs?: number;
  className?: string;
}

const digits = (value: number) => String(Math.max(0, value)).padStart(2, '0').replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);

/** Learner-safe countdown: use the API clock when present, never a client mutation. */
export const LiveSessionCountdown: React.FC<LiveSessionCountdownProps> = ({
  startsAt,
  serverNow,
  serverOffsetMs,
  className = '',
}) => {
  const target = useMemo(() => (startsAt ? Date.parse(startsAt) : Number.NaN), [startsAt]);
  const clockOffset = useMemo(() => {
    if (serverOffsetMs !== undefined) return serverOffsetMs;
    const serverTime = serverNow ? Date.parse(serverNow) : Number.NaN;
    // Reading the wall clock once per render is unavoidable for a real offset;
    // the remaining-time state below then only changes inside the interval tick.
    // eslint-disable-next-line react-hooks/purity
    return Number.isFinite(serverTime) ? serverTime - Date.now() : 0;
  }, [serverNow, serverOffsetMs]);
  const [remaining, setRemaining] = useState(() => (Number.isFinite(target) ? target - (Date.now() + clockOffset) : 0));

  useEffect(() => {
    if (!Number.isFinite(target)) return undefined;
    const tick = () => setRemaining(Math.max(0, target - (Date.now() + clockOffset)));
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [clockOffset, target]);

  const classes = `live-sessions-countdown ${className}`.trim();
  if (!Number.isFinite(target)) return <span className={classes}>التاريخ غير محدد</span>;
  if (remaining <= 0) return <span className={`${classes} live-sessions-countdown-live`}>تبدأ الآن</span>;
  const totalSeconds = Math.floor(remaining / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const text = days > 0 ? `${digits(days)} يوم · ${digits(hours)}:${digits(minutes)}` : `${digits(hours)}:${digits(minutes)}:${digits(seconds)}`;
  return <span className={classes} aria-label={`الوقت المتبقي ${text}`}>بعد {text}</span>;
};
