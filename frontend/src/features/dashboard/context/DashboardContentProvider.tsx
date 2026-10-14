import React from 'react';
import {
  DASHBOARD_CHAMBERS,
  DASHBOARD_CONTENT,
} from '@/features/dashboard/data/dashboardContent';
import { DashboardContentContext } from '@/features/dashboard/context/DashboardContentContext';

/**
 * Shares the static dashboard view/chamber chrome with every consumer.
 * This is presentation config (titles, chips, tabs), so it never round-trips.
 */
export const DashboardContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DashboardContentContext.Provider
    value={{ content: { views: DASHBOARD_CONTENT }, chambers: DASHBOARD_CHAMBERS }}
  >
    {children}
  </DashboardContentContext.Provider>
);
