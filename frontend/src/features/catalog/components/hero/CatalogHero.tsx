import React from 'react';
import { SmartSearchBox } from '@/shared/components/Search/SmartSearchBox';
import catalogJson from '@/shared/json/catalog.json';
import { useCatalog } from '@/features/catalog/context/catalogContext';

/** Page hero with both search slots — one component, breakpoints pick the layout. */
export const CatalogHero: React.FC = () => {
  const { activeTab, searchProps } = useCatalog();
  const pageTitles = catalogJson.pageTitles[activeTab];

  return (
    <section className="catalog-hero animate-fade-in-up">
      <h1 className="catalog-hero-title">{pageTitles.title}</h1>
      <p className="catalog-hero-subtitle">{pageTitles.subtitle}</p>

      {/* Desktop and mobile search boxes differ only in layout */}
      <div className="hidden md:flex catalog-search-slot">
        <SmartSearchBox variant="desktop" {...searchProps} />
      </div>

      <div className="flex md:hidden catalog-search-slot mt-3">
        <SmartSearchBox variant="mobile" {...searchProps} />
      </div>
    </section>
  );
};