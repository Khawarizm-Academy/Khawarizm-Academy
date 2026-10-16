import { createContext, useContext } from 'react';
import catalogJson from '@/shared/json/catalog.json';
import type { CatalogItem } from '@/shared/types/entities';
import type { CatalogFiltersState, CatalogTab, SearchType, SortOptionItem } from '@/features/catalog/types';
import type { ResolvedFilterGroup, Surface } from '@/features/catalog/data/catalogFilters';

// Non-pillar filters live in local state; `type` and `q` are URL-derived.
export type PersistentFilters = Omit<CatalogFiltersState, 'type' | 'searchQuery'>;

/** The search box speaks SearchType, the URL speaks CatalogTab. */
export const SEARCH_TYPE_BY_TAB = catalogJson.searchTypeByTab as Record<CatalogTab, SearchType>;
export const TAB_BY_SEARCH_TYPE = catalogJson.tabBySearchType as Record<SearchType, CatalogTab>;

export const DEFAULT_FILTERS: PersistentFilters = {
  field: 'all',
  level: 'all',
  language: 'all',
  cost: 'all',
  country: 'all',
  status: 'all',
  sortBy: 'newest',
  page: 1,
};

/** Every prop the shared SmartSearchBox slots need, built once in the provider. */
export interface SearchBoxProps {
  selectedType: SearchType;
  onTypeChange: (type: SearchType) => void;
  initialQuery: string;
  onSearch: (query: string, searchType?: SearchType) => void;
}

export interface CatalogContextValue {
  activeTab: CatalogTab;
  filters: CatalogFiltersState;
  /** Filter groups per surface, fetched from the database for the active tab. */
  filterGroups: Record<Surface, ResolvedFilterGroup[]>;
  /** Sort options, fetched from the database. */
  sortOptions: SortOptionItem[];
  /** True while the filter metadata for the active tab loads. */
  isFiltersLoading: boolean;
  isFilterDrawerOpen: boolean;
  searchProps: SearchBoxProps;
  changeTab: (tab: CatalogTab) => void;
  search: (query: string, searchType?: SearchType) => void;
  changeFilter: <K extends keyof CatalogFiltersState>(key: K, value: CatalogFiltersState[K]) => void;
  resetFilters: () => void;
  selectCard: (item: CatalogItem) => void;
  openFilterDrawer: () => void;
  closeFilterDrawer: () => void;
}

export const CatalogContext = createContext<CatalogContextValue | null>(null);

/** Every piece of catalog page state the sections share, without prop drilling. */
export function useCatalog(): CatalogContextValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('[catalog] useCatalog must be used inside CatalogProvider.');
  return value;
}