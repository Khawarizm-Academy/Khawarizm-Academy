import React from 'react';
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
    <div className="fixed inset-0 z-[120] flex items-end justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#040F24]/80 backdrop-blur-sm transition-opacity animate-fade-in-up"
      />

      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#061A3A] border-t-2 border-[#1B3F80] rounded-t-2xl p-6 flex flex-col gap-6 shadow-2xl animate-fade-in-up">
        <div className="w-12 h-1.5 bg-[#1B3F80] rounded-full mx-auto -mt-2" />

        <div className="flex-between pb-3 border-b border-[#1B3F80]/50">
          <div className="flex items-center gap-2 text-white font-bold font-['IBM_Plex_Sans_Arabic'] text-lg">
            <span>{catalogJson.filters.header}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onReset}
              className="text-[#E5B65C] hover:underline text-xs font-medium font-['Tajawal']"
            >
              {catalogJson.filters.resetLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon-box w-8 h-8 text-slate-400"
            >
              ✕
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
          <button
            type="button"
            onClick={onClose}
            className="w-full btn-gold py-3 text-sm font-bold"
          >
            {catalogJson.filters.applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
