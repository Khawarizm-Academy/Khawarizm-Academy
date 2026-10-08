import React from 'react';
import { X } from 'lucide-react';
import catalogJson from '../../../shared/json/catalog.json';
import { CatalogFilterGroups } from './CatalogFilterGroups';
import type { CatalogFiltersState, CatalogTab } from '../types';

interface CatalogMobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: CatalogTab;
  filters: CatalogFiltersState;
  onChangeFilter: <K extends keyof CatalogFiltersState>(key: K, value: CatalogFiltersState[K]) => void;
  onReset: () => void;
}

export const CatalogMobileFilterDrawer: React.FC<CatalogMobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  type,
  filters,
  onChangeFilter,
  onReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="catalog-drawer">
      <div onClick={onClose} className="catalog-drawer-scrim animate-fade-in-up" />

      <div className="catalog-drawer-panel animate-fade-in-up">
        <div className="catalog-drawer-handle" />

        <div className="catalog-panel-head">
          <div className="catalog-panel-title text-lg">
            <span>{catalogJson.filters.header}</span>
          </div>

          <div className="flex items-center gap-4">
            <button type="button" onClick={onReset} className="catalog-reset hover:underline">
              {catalogJson.filters.resetLabel}
            </button>
            <button type="button" onClick={onClose} className="btn-icon-box" aria-label="إغلاق">
              <X size={16} />
            </button>
          </div>
        </div>

        <CatalogFilterGroups
          tab={type}
          filters={filters}
          surface="mobile"
          onChangeFilter={onChangeFilter}
        />

        <div className="pt-2">
          <button type="button" onClick={onClose} className="w-full btn-gold text-sm">
            {catalogJson.filters.applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
