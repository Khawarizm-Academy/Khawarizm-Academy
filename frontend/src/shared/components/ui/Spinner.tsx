import React from 'react';
import { toArabic } from '@/shared/lib/localization';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  /** Ring color rides `currentColor`; set a text color class to contrast the surface. */
  className?: string;
}

const SIZE: Record<SpinnerSize, string> = {
  sm: 'h-3.5 w-3.5 border-2',
  md: 'h-4 w-4 border-2',
  lg: 'h-5 w-5 border-2',
};

/** Inline ring busy-indicator shared by buttons, cards and modals. */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => (
  <span
    role="status"
    aria-label={toArabic('ui', 'loading')}
    className={`inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent ${SIZE[size]} ${className}`}
  />
);
