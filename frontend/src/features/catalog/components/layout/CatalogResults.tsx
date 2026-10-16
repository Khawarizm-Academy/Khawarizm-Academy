import React from 'react';
import catalogJson from '@/shared/json/catalog.json';
import { useCatalog } from '@/features/catalog/context/catalogContext';
import { CatalogFilterSidebar } from '@/features/catalog/components/filters/CatalogFilterSidebar';
import { CatalogToolbar } from '@/features/catalog/components/toolbar/CatalogToolbar';
import { CatalogDataSection } from '@/features/catalog/components/layout/CatalogDataSection';
import type { SortOption } from '@/features/catalog/types';

/** Results column plus the desktop filter rail — one responsive grid. */
export const CatalogResults: React.FC = () => {
  const { activeTab, filters, changeFilter, resetFilters, selectCard, openFilterDrawer, sortOptions } = useCatalog();
  const pageTitles = catalogJson.pageTitles[activeTab];

  return (
    <div className="catalog-results animate-fade-in-up">
      {/* Results */}
      <div className="catalog-results-main">
        <CatalogToolbar
          totalCount={0}
          itemTypeLabel={pageTitles.countLabel}
          currentSort={filters.sortBy}
          sortOptions={sortOptions}
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
          filters={filters}
          onChangeFilter={changeFilter}
          onReset={resetFilters}
        />
      </aside>
    </div>
  );
};