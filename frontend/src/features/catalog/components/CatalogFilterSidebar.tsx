import React from 'react';
import { Filter } from 'lucide-react';
import catalogJson from '../../../shared/json/catalog.json';
import { CatalogFilterGroups } from './CatalogFilterGroups';
import type { CatalogFiltersState, CatalogTab } from '../types';

interface CatalogFilterSidebarProps {
  type: CatalogTab;
  filters: CatalogFiltersState;
  onChangeFilter: <K extends keyof CatalogFiltersState>(key: K, value: CatalogFiltersState[K]) => void;
  onReset: () => void;
}

export const CatalogFilterSidebar: React.FC<CatalogFilterSidebarProps> = ({
  type,
  filters,
  onChangeFilter,
  onReset,
}) => {
  return (
    <aside className="w-72 p-5 sm:p-6 bg-[#061A3A]/90 backdrop-blur-md rounded-xl border border-[#1B3F80] flex flex-col gap-5 select-none shadow-xl sticky top-24">
      <div className="flex-between pb-3 border-b border-[#1B3F80]/50">
        <div className="flex items-center gap-2 text-white font-bold font-['IBM_Plex_Sans_Arabic'] text-base">
          <Filter size={16} className="text-[#E5B65C]" />
          <span>{catalogJson.filters.header}</span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-[#E5B65C] hover:text-[#F3CE7A] text-xs font-medium font-['Tajawal'] cursor-pointer transition-colors"
        >
          {catalogJson.filters.resetLabel}
        </button>
      </div>

      <CatalogFilterGroups
        tab={type}
        filters={filters}
        surface="desktop"
        onChangeFilter={onChangeFilter}
      />
    </aside>
  );
};
