import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  iconClassName?: string;
  children: React.ReactNode;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  icon: Icon,
  title,
  iconClassName = 'text-sky-400',
  children,
}) => (
  <section className="workspace-card p-5 sm:p-6">
    <header className="workspace-header">
      <Icon size={18} className={`${iconClassName} shrink-0`} />
      <h2 className="text-white text-base sm:text-lg font-bold font-['IBM_Plex_Sans_Arabic']">
        {title}
      </h2>
    </header>
    {children}
  </section>
);