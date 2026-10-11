import React from 'react';
import catalogJson from '../../../shared/json/catalog.json';
import { useCatalog } from '../context/catalogContext';
import { CatalogFilterSidebar } from './CatalogFilterSidebar';
import { CatalogToolbar } from './CatalogToolbar';
import { CatalogDataSection } from './CatalogDataSection';
import type { SortOption } from '../types';

/** Results column plus the desktop filter rail — one responsive grid. */
export const CatalogResults: React.FC = () => {
  const { activeTab, filters, changeFilter, resetFilters, selectCard, openFilterDrawer } = useCatalog();
  const pageTitles = catalogJson.pageTitles[activeTab];

  return (
    <div className="catalog-results animate-fade-in-up">
      {/* Results */}
      <div className="catalog-results-main">
        <CatalogToolbar
          totalCount={0}
          itemTypeLabel={pageTitles.countLabel}
          currentSort={filters.sortBy}
          onChangeSort={(sort: SortOption) => changeFilter('sortBy', sort)}
          onOpenMobileFilters={openFilterDrawer}
        />

        <CatalogDataSection
          filters={filters}
          activeTab={activeTab}
          onPageChange={(page) => changeFilter('page', page)}
          onResetFilters={resetFilters}
          onSelectCard={selectCard}
        />
      </div>

      <aside className="catalog-results-aside">
        <CatalogFilterSidebar
          type={activeTab}
          filters={filters}
          onChangeFilter={changeFilter}
          onReset={resetFilters}
        />
      </aside>
    </div>
  );
};