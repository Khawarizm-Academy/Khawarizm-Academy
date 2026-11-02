import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatTileProps { label: string; value: string | number; icon?: LucideIcon; tone?: 'blue' | 'gold' | 'neutral'; }
export const StatTile: React.FC<StatTileProps> = ({ label, value, icon: Icon, tone = 'blue' }) => (
  <article className={`workspace-stat-tile workspace-stat-${tone}`}><div className="workspace-stat-icon">{Icon && <Icon size={17} />}</div><div><strong className="workspace-stat-value tabular-nums">{value}</strong><span className="workspace-stat-label">{label}</span></div></article>
);
