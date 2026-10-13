import React from 'react';
import { DashboardContentProvider } from '@/features/dashboard/context/DashboardContentProvider';
import { DashboardProvider } from '@/features/dashboard/context/DashboardProvider';
import { DashboardShell } from '@/features/dashboard/components/layout/DashboardShell';

/** Dashboard page — thin orchestrator; content loads first, then page state. */
export const DashboardPage: React.FC = () => (
  <DashboardContentProvider>
    <DashboardProvider>
      <DashboardShell />
    </DashboardProvider>
  </DashboardContentProvider>
);
