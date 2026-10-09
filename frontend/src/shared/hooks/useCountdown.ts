import { useEffect, useState } from 'react';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Ticks once per second and rolls days → hours → minutes → seconds.
 * Pass an initial value; the hook owns the ticking from then on.
 */
export function useCountdown(initial: CountdownParts): CountdownParts {
  const [parts, setParts] = useState(initial);

  useEffect(() => {
    const timer = setInterval(() => {
      setParts((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return parts;
}
