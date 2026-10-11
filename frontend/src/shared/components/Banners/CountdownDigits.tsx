import React from 'react';
import type { CountdownParts } from '@/shared/hooks/useCountdown';

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

/** Display variant to its cell / text / label / separator classes. */
const VARIANT = {
  mobile: {
    cell: 'digit-box-mobile',
    cellActive: 'digit-box-mobile-active',
    text: 'digit-text digit-text-mobile',
    textActive: 'digit-text digit-text-mobile-active',
    label: 'digit-label digit-label-mobile',
    separator: 'digit-sep digit-sep-mobile',
    gaps: 'count-gap-mobile',
  },
  desktop: {
    cell: 'digit-box digit-cell',
    cellActive: 'digit-box-active digit-cell',
    text: 'digit-text text-xl',
    textActive: 'digit-text text-xl digit-text-desktop-active',
    label: 'digit-label digit-label-desktop',
    separator: 'digit-sep digit-sep-desktop',
    gaps: 'count-gap-desktop',
  },
} as const;

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
  const styles = VARIANT[variant];

  return (
    <div className={`count-row ${styles.gaps} ${className}`}>
      {UNITS.map((unit, idx) => {
        const isSeconds = unit.key === 'seconds';
        return (
          <React.Fragment key={unit.key}>
            {idx > 0 && <span className={styles.separator}>:</span>}
            <div className="flex-col-center">
              <div className={isSeconds ? styles.cellActive : styles.cell}>
                <span className={isSeconds ? styles.textActive : styles.text}>
                  {pad(value[unit.key])}
                </span>
              </div>
              <span className={styles.label}>{unit.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
