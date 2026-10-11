import React from 'react';
import { DashboardProvider } from '@/features/dashboard/context/DashboardProvider';
import { DashboardShell } from '@/features/dashboard/components/layout/DashboardShell';

/** Dashboard page — thin orchestrator; state lives in DashboardProvider. */
export const DashboardPage: React.FC = () => (
  <DashboardProvider>
    <DashboardShell />
  </DashboardProvider>
);