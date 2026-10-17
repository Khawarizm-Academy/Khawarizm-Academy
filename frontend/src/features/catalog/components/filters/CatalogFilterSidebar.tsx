import React from 'react';
import { Filter } from 'lucide-react';
import catalogJson from '@/shared/json/catalog.json';
import { CatalogFilterGroups } from '@/features/catalog/components/filters/CatalogFilterGroups';
import type { CatalogFiltersState } from '@/features/catalog/types';

interface CatalogFilterSidebarProps {
  filters: CatalogFiltersState;
  onChangeFilter: <K extends keyof CatalogFiltersState>(key: K, value: CatalogFiltersState[K]) => void;
  onReset: () => void;
}

export const CatalogFilterSidebar: React.FC<CatalogFilterSidebarProps> = ({
  filters,
  onChangeFilter,
  onReset,
}) => {
  return (
    <aside className="catalog-sidebar">
      <div className="catalog-panel-head">
        <div className="catalog-panel-title">
          <Filter size={16} className="text-gold-400" />
          <span>{catalogJson.filters.header}</span>
        </div>

        <button type="button" onClick={onReset} className="catalog-reset hover:text-gold-200">
          {catalogJson.filters.resetLabel}
        </button>
      </div>

      <CatalogFilterGroups
        filters={filters}
        surface="desktop"
        onChangeFilter={onChangeFilter}
      />
    </aside>
  );
};
