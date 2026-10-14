import React from 'react';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { PageSkeleton } from '@/shared/components/Loading/PageSkeleton';
import {
  fetchDashboardChambers,
  fetchDashboardContent,
} from '@/features/dashboard/data/dashboardContentFetcher';
import type {
  DashboardChambersPayload,
  DashboardContentPayload,
} from '@/features/dashboard/data/dashboardContentFetcher';
import { DashboardContentContext } from '@/features/dashboard/context/DashboardContentContext';

/**
 * Fetches the dashboard's static view/chamber content once and shares it.
 * Renders the dashboard skeleton until both payloads arrive, so every consumer
 * can read the content synchronously afterwards.
 */
export const DashboardContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: content, isLoading: isContentLoading } = useCachedData<DashboardContentPayload>(
    ['dashboard', 'content'],
    fetchDashboardContent
  );
  const { data: chambers, isLoading: isChambersLoading } = useCachedData<DashboardChambersPayload>(
    ['dashboard', 'chambers'],
    fetchDashboardChambers
  );

  if (isContentLoading || isChambersLoading || !content || !chambers) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <DashboardContentContext.Provider value={{ content, chambers }}>
      {children}
    </DashboardContentContext.Provider>
  );
};
