import { createContext, useContext } from 'react';
import type {
  DashboardChambersPayload,
  DashboardContentPayload,
} from '@/features/dashboard/data/dashboardContentFetcher';

export interface DashboardContentContextValue {
  content: DashboardContentPayload;
  chambers: DashboardChambersPayload;
}

export const DashboardContentContext = createContext<DashboardContentContextValue | null>(null);

/** Every dashboard view/chamber content value the chrome and chambers share. */
export function useDashboardContent(): DashboardContentContextValue {
  const value = useContext(DashboardContentContext);
  if (!value) {
    throw new Error('[dashboard] useDashboardContent must be used inside DashboardContentProvider.');
  }
  return value;
}
