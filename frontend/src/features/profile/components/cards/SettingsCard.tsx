import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  iconClassName?: string;
  /** Stagger position for the card cascade. */
  index?: number;
  children: React.ReactNode;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  icon: Icon,
  title,
  iconClassName = 'text-blue-400',
  index = 0,
  children,
}) => (
  <section className="profile-card group animate-pop-in" style={{ animationDelay: `${index * 90}ms` }}>
    <header className="profile-card-head">
      <span className={`profile-card-icon ${iconClassName}`}>
        <Icon size={17} strokeWidth={2} />
      </span>
      <h2 className="profile-card-title">{title}</h2>
    </header>
    {children}
  </section>
);
