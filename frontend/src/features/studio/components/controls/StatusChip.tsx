import React from 'react';
import statusMeta from '@/features/studio/data/statusMeta.json';
import type { StudioStatus } from '@/features/studio/types';
export const StatusChip: React.FC<{ status: StudioStatus }> = ({ status }) => { const meta = statusMeta[status]; return <span className={`studio-status-chip studio-status-${meta.tone}`}>{meta.label}</span>; };
