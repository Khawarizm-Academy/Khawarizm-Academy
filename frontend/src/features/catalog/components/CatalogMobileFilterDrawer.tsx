import React from 'react';
import { X } from 'lucide-react';
import catalogJson from '../../../shared/json/catalog.json';
import { useCatalog } from '../context/catalogContext';
import { CatalogFilterGroups } from './CatalogFilterGroups';

/** Mobile filter sheet; reads context and renders nothing when closed. */
export const CatalogMobileFilterDrawer: React.FC = () => {
  const { isFilterDrawerOpen, closeFilterDrawer, activeTab, filters, changeFilter, resetFilters } = useCatalog();

  if (!isFilterDrawerOpen) return null;

  return (
    <div className="catalog-drawer">
      <div onClick={closeFilterDrawer} className="catalog-drawer-scrim animate-fade-in" />

      <div className="catalog-drawer-panel animate-fade-in-up">
        <div className="catalog-drawer-handle" />

        <div className="catalog-panel-head">
          <div className="catalog-panel-title text-lg">
            <span>{catalogJson.filters.header}</span>
          </div>

          <div className="flex items-center gap-4">
            <button type="button" onClick={resetFilters} className="catalog-reset hover:underline">
              {catalogJson.filters.resetLabel}
            </button>
            <button type="button" onClick={closeFilterDrawer} className="btn-icon-box" aria-label="إغلاق">
              <X size={16} />
            </button>
          </div>
        </div>

        <CatalogFilterGroups
          tab={activeTab}
          filters={filters}
          surface="mobile"
          onChangeFilter={changeFilter}
        />

        <div className="pt-2">
          <button type="button" onClick={closeFilterDrawer} className="w-full btn-gold text-sm">
            {catalogJson.filters.applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
};