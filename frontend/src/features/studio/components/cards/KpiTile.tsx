import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { StatTile } from '@/shared/components/Workspace/StatTile';
export const KpiTile: React.FC<{ label: string; value: string | number; icon: LucideIcon; tone?: 'blue' | 'gold' | 'neutral' }> = (props) => <StatTile {...props} />;
