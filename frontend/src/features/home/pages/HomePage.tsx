import React from 'react';
import { HomeProvider } from '@/features/home/context/HomeProvider';
import { HomeContent } from '@/features/home/components/layout/HomeContent';

/** Home page — thin orchestrator; state lives in HomeProvider. */
export const HomePage: React.FC = () => (
  <HomeProvider>
    <HomeContent />
  </HomeProvider>
);