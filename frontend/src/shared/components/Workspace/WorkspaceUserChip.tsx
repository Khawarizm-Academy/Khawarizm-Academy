import React from 'react';
import { UserAvatar } from '@/shared/components/Artwork/UserAvatar';

interface WorkspaceUserChipProps { name?: string; role?: string; avatarUrl?: string; initials?: string; onClick?: () => void; }

export const WorkspaceUserChip: React.FC<WorkspaceUserChipProps> = ({ name = '', role = '', avatarUrl = '', initials = '', onClick }) => (
  <button type="button" onClick={onClick} className="workspace-user-chip" title={name}>
    <UserAvatar src={avatarUrl} initials={initials} className="dash-avatar size-10" />
    <span className="workspace-user-copy"><strong>{name}</strong><small>{role}</small></span>
  </button>
);
