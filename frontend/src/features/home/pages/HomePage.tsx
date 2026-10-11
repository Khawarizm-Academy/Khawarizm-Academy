import React from 'react';
import { HomeProvider } from '../context/HomeProvider';
import { HomeContent } from '../components/HomeContent';

/** Home page — thin orchestrator; state lives in HomeProvider. */
export const HomePage: React.FC = () => (
  <HomeProvider>
    <HomeContent />
  </HomeProvider>
);