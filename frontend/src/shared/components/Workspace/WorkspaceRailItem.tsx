import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface WorkspaceRailItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
}

export const WorkspaceRailItem: React.FC<WorkspaceRailItemProps> = ({ icon: Icon, label, active = false, onClick, className = '' }) => (
  <button type="button" title={label} aria-current={active ? 'page' : undefined} onClick={onClick} className={`workspace-rail-item ${active ? 'workspace-rail-item-active' : ''} ${className}`}>
    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className="workspace-rail-item-icon" />
    <span className="workspace-rail-item-label">{label}</span>
  </button>
);
