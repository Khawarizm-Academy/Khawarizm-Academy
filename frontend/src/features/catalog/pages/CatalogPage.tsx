import React from 'react';
import { CatalogProvider } from '@/features/catalog/context/CatalogProvider';
import { CatalogHero } from '@/features/catalog/components/hero/CatalogHero';
import { CatalogResults } from '@/features/catalog/components/layout/CatalogResults';
import { CatalogMobileFilterDrawer } from '@/features/catalog/components/filters/CatalogMobileFilterDrawer';

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