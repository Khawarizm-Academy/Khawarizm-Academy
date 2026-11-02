import { useMemo } from 'react';
import { useAuth } from '@/features/auth/context/authContext';
import { can } from '@/shared/lib/permissions';
import { resolveIcon } from '@/shared/lib/navigation';
import sectionsJson from '@/features/studio/data/studioSections.json';
import type { StudioSection } from '@/features/studio/types';

export function useStudioNav() { const { user } = useAuth(); return useMemo(() => (sectionsJson as StudioSection[]).filter((section) => can(user, section.permission)).map((section) => ({ ...section, icon: resolveIcon(section.icon) })), [user]); }
