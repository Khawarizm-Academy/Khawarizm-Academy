import React, { useCallback } from 'react';
import { useAuth } from '@/features/auth/context/authContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { dataCacheManager } from '@/shared/lib/cacheManager';
import { fetchStudioOverview } from '@/features/studio/data/studioFetchers';
import { StudioContext } from '@/features/studio/context/studioContext';
import type { StudioOverview } from '@/features/studio/types';

const EMPTY: StudioOverview = { courses: { draft: 0, in_review: 0, published: 0, archived: 0 }, enrollments: 0, inReview: 0, readiness: 0, inbox: [], recentActivity: [], series: [] };
export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const key = ['studio-overview', user?.id ?? 'anonymous'];
  const result = useCachedData<StudioOverview>(key, fetchStudioOverview, { enabled: Boolean(user), initialData: EMPTY, staleTime: 30_000, cacheTime: 5 * 60_000 });
  const invalidate = useCallback(() => dataCacheManager.invalidate('studio-overview'), []);
  return <StudioContext.Provider value={{ overview: result.data, isLoading: result.isLoading, isError: result.isError, refresh: result.refetch, invalidate }}>{children}</StudioContext.Provider>;
};
