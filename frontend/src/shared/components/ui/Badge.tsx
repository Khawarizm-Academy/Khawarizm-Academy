import React from 'react';

export type BadgeTone = 'default' | 'gold' | 'blue' | 'green' | 'red' | 'neutral';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

const TONE: Record<BadgeTone, string> = {
  default: 'badge badge-default',
  gold: 'badge badge-gold',
  blue: 'badge badge-blue',
  green: 'badge badge-green',
  red: 'badge badge-red',
  neutral: 'badge badge-neutral',
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'default', children, className = '' }) => (
  <span className={`${TONE[tone]} ${className}`}>{children}</span>
);
