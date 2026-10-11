import React from 'react';
import { DashboardProvider } from '../context/DashboardProvider';
import { DashboardShell } from '../components/DashboardShell';

/** Dashboard page — thin orchestrator; state lives in DashboardProvider. */
export const DashboardPage: React.FC = () => (
  <DashboardProvider>
    <DashboardShell />
  </DashboardProvider>
);