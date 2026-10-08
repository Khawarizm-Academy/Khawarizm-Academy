import React, { useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import catalogJson from '../../../shared/json/catalog.json';
import type { SortOption } from '../types';

interface CatalogToolbarProps {
  totalCount: number;
  itemTypeLabel?: string;
  currentSort: SortOption;
  onChangeSort: (sort: SortOption) => void;
  onOpenMobileFilters?: () => void;
}

const SORT_OPTIONS = catalogJson.sortOptions as { id: SortOption; label: string }[];

export const CatalogToolbar: React.FC<CatalogToolbarProps> = ({
  totalCount,
  itemTypeLabel = 'نتيجة',
  currentSort,
  onChangeSort,
  onOpenMobileFilters,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeSortLabel = SORT_OPTIONS.find((s) => s.id === currentSort)?.label || 'الأحدث';

  return (
    <div className="catalog-toolbar">
      {/* Results count */}
      <div className="text-slate-300 font-medium flex items-center gap-2">
        <span>تم العثور على</span>
        <span className="catalog-toolbar-count">{totalCount}</span>
        <span>{itemTypeLabel}</span>
      </div>

      {/* Mobile filter trigger and sort dropdown */}
      <div className="flex items-center gap-3 justify-between sm:justify-end">
        {onOpenMobileFilters && (
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="catalog-chip-btn catalog-chip-filters"
          >
            <Filter size={14} />
            <span>{catalogJson.filters.header}</span>
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="catalog-chip-btn catalog-chip-sort"
          >
            <ChevronDown size={12} className="text-slate-400" />
            <span className="text-gold-400 font-semibold">{activeSortLabel}</span>
            <span className="text-slate-400">ترتيب حسب:</span>
          </button>

          {dropdownOpen && (
            <div className="catalog-sort-menu animate-fade-in-up">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChangeSort(opt.id);
                    setDropdownOpen(false);
                  }}
                  className={`catalog-sort-option ${
                    currentSort === opt.id ? 'catalog-sort-option-active' : 'catalog-sort-option-idle'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
