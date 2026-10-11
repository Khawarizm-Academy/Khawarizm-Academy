import React from 'react';
import { CatalogProvider } from '../context/CatalogProvider';
import { CatalogHero } from '../components/CatalogHero';
import { CatalogResults } from '../components/CatalogResults';
import { CatalogMobileFilterDrawer } from '../components/CatalogMobileFilterDrawer';

/** Catalog page — thin orchestrator; state lives in CatalogProvider. */
export const CatalogPage: React.FC = () => (
  <CatalogProvider>
    <main className="content-container">
      <CatalogHero />
      <CatalogResults />
      <CatalogMobileFilterDrawer />
    </main>
  </CatalogProvider>
);