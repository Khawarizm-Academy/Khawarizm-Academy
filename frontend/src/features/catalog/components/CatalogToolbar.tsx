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
    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-[#1B3F80]/40 text-sm font-['Tajawal'] select-none">
      
      {/* Results count */}
      <div className="text-slate-300 font-medium flex items-center gap-2">
        <span>تم العثور على</span>
        <span className="font-bold text-white tabular-nums px-1.5 py-0.5 rounded-md bg-[#092557]/60 border border-[#1B3F80]/50 text-xs">
          {totalCount}
        </span>
        <span>{itemTypeLabel}</span>
      </div>

      {/* Mobile filter trigger and sort dropdown */}
      <div className="flex items-center gap-3 justify-between sm:justify-end">
        {onOpenMobileFilters && (
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="lg:hidden flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#061A3A] border border-[#1B3F80] hover:border-[#E5B65C] text-[#E5B65C] text-xs font-semibold cursor-pointer shadow-sm transition-all"
          >
            <Filter size={14} />
            <span>{catalogJson.filters.header}</span>
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#061A3A] border border-[#1B3F80] hover:border-[#29A9FF]/50 text-slate-300 text-xs font-medium cursor-pointer shadow-sm transition-all"
          >
            <ChevronDown size={12} className="text-slate-400" />
            <span className="text-[#E5B65C] font-semibold">{activeSortLabel}</span>
            <span className="text-slate-400">ترتيب حسب:</span>
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-40 bg-[#061A3A] border border-[#1B3F80] rounded-xl shadow-2xl py-1.5 z-30 animate-fade-in-up">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChangeSort(opt.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-right px-4 py-2 text-xs transition-colors cursor-pointer ${
                    currentSort === opt.id
                      ? 'bg-[#E5B65C]/15 text-[#E5B65C] font-bold'
                      : 'text-slate-300 hover:bg-[#123168] hover:text-white'
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
