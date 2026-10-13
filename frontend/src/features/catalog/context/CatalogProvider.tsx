import React, { useState } from 'react';
import { useNavigate, useSearchParams } from '@/app/routerContext';
import { CatalogContext, DEFAULT_FILTERS, SEARCH_TYPE_BY_TAB, TAB_BY_SEARCH_TYPE } from '@/features/catalog/context/catalogContext';
import type { CatalogItem } from '@/shared/types/entities';
import type { CatalogContextValue, PersistentFilters, SearchBoxProps } from '@/features/catalog/context/catalogContext';
import type { CatalogFiltersState, CatalogTab, SearchType } from '@/features/catalog/types';

/** Owns every piece of catalog page state so all sections read one source. */
export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active type and query are URL-derived — single source of truth, no effect-sync.
  const activeTab = (searchParams.get('type') as CatalogTab) || 'all';
  const initialQueryFromUrl = searchParams.get('q') || '';

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [persistentFilters, setPersistentFilters] = useState<PersistentFilters>(DEFAULT_FILTERS);

  // Merged view-state handed to the data section (reacts only when it changes).
  const filters: CatalogFiltersState = {
    ...persistentFilters,
    type: activeTab,
    searchQuery: initialQueryFromUrl,
  };

  // Tab switch resets paging and drops the level filter.
  const changeTab = (newTab: CatalogTab) => {
    setPersistentFilters((prev) => ({ ...prev, page: 1, level: 'all' }));
    setSearchParams({
      type: newTab,
      ...(filters.searchQuery ? { q: filters.searchQuery } : {}),
    });
  };

  // Search submit rewrites the URL — `type` and `q` both live there.
  const search = (query: string, searchType?: SearchType) => {
    setPersistentFilters((prev) => ({ ...prev, page: 1 }));
    setSearchParams({
      type: searchType ? TAB_BY_SEARCH_TYPE[searchType] : activeTab,
      ...(query ? { q: query } : {}),
    });
  };

  const changeFilter = <K extends keyof CatalogFiltersState>(key: K, value: CatalogFiltersState[K]) => {
    // `type` and `q` are URL-derived — the filter UI never touches them.
    if (key === 'type' || key === 'searchQuery') return;
    setPersistentFilters((prev) => ({ ...prev, [key]: value, page: 1 }) as PersistentFilters);
  };

  const resetFilters = () => {
    setPersistentFilters(DEFAULT_FILTERS);
    setSearchParams({ type: activeTab });
  };

  const selectCard = (selected: CatalogItem) => {
    if (selected.type === 'course') navigate(`/courses/${selected.id}`);
    else navigate(`/scholarships/${selected.id}`);
  };

  // Both search surfaces share every prop except the variant wrapper.
  const searchProps: SearchBoxProps = {
    selectedType: SEARCH_TYPE_BY_TAB[activeTab],
    onTypeChange: (t: SearchType) => changeTab(TAB_BY_SEARCH_TYPE[t]),
    initialQuery: filters.searchQuery,
    onSearch: search,
  };

  const value: CatalogContextValue = {
    activeTab,
    filters,
    isFilterDrawerOpen,
    searchProps,
    changeTab,
    search,
    changeFilter,
    resetFilters,
    selectCard,
    openFilterDrawer: () => setIsFilterDrawerOpen(true),
    closeFilterDrawer: () => setIsFilterDrawerOpen(false),
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};