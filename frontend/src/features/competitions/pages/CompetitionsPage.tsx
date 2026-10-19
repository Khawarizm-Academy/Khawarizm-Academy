import React from 'react';
import { CompetitionsHero } from '@/features/competitions/components/hero/CompetitionsHero';
import { CompetitionsDataSection } from '@/features/competitions/components/layout/CompetitionsDataSection';

/** Competitions page — hero plus the cached competitions data section. */
export const CompetitionsPage: React.FC = () => (
  <main className="content-container">
    <CompetitionsHero />
    <CompetitionsDataSection />
  </main>
);
