import React from 'react';
import type { CountdownParts } from '../../hooks/useCountdown';

interface CountdownDigitsProps {
  value: CountdownParts;
  variant?: 'desktop' | 'mobile';
  className?: string;
}

/** Day / hour / minute / second order, RTL first-to-last. */
const UNITS: Array<{ key: keyof CountdownParts; label: string }> = [
  { key: 'days', label: 'أيام' },
  { key: 'hours', label: 'ساعة' },
  { key: 'minutes', label: 'دقيقة' },
  { key: 'seconds', label: 'ثانية' },
];

const pad = (num: number) => String(num).padStart(2, '0');

/**
 * The observatory countdown digit row. Shared by the home competition banner
 * and the dashboard challenge spotlight so the two never drift apart.
 */
export const CountdownDigits: React.FC<CountdownDigitsProps> = ({
  value,
  variant = 'desktop',
  className = '',
}) => {
  const isMobile = variant === 'mobile';

  const cell = isMobile ? 'digit-box-mobile' : 'digit-box min-w-[54px] h-[48px] px-2.5';
  const cellActive = isMobile
    ? 'digit-box-mobile-active'
    : 'digit-box-active min-w-[54px] h-[48px] px-2.5';
  const text = isMobile
    ? 'digit-text text-2xl sm:text-3xl drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]'
    : 'digit-text text-xl';
  const textActive = isMobile
    ? 'digit-text text-2xl sm:text-3xl drop-shadow-[0_0_10px_rgba(229,182,92,0.7)]'
    : 'digit-text text-xl drop-shadow-[0_0_6px_rgba(229,182,92,0.6)]';
  const label = isMobile ? 'digit-label text-xs mt-1.5' : 'digit-label text-[11px] mt-1';
  const separator = isMobile
    ? 'text-2xl font-bold text-[#E5B65C] -mt-6 animate-pulse'
    : 'text-xl font-bold text-[#E5B65C] -mt-5 animate-pulse';
  const gaps = isMobile ? 'gap-2 sm:gap-3 my-1' : 'gap-2 sm:gap-2.5';

  return (
    <div
      className={`flex items-center font-['IBM_Plex_Sans_Arabic'] ${gaps} ${className}`}
    >
      {UNITS.map((unit, idx) => {
        const isSeconds = unit.key === 'seconds';
        return (
          <React.Fragment key={unit.key}>
            {idx > 0 && <span className={separator}>:</span>}
            <div className="flex-col-center">
              <div className={isSeconds ? cellActive : cell}>
                <span className={isSeconds ? textActive : text}>{pad(value[unit.key])}</span>
              </div>
              <span className={label}>{unit.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
