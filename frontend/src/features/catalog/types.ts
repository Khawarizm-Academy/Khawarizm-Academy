export type CatalogTab = 'all' | 'courses' | 'scholarships';

/** The search box speaks this; the URL speaks CatalogTab. */
export type SearchType = 'all' | 'course' | 'scholarship';

export type SortOption = 'newest' | 'rating' | 'popular' | 'deadline';

export interface CatalogFiltersState {
  type: CatalogTab;
  field: string;
  level: string;
  language: string;
  cost: string;
  country: string;
  status: string;
  sortBy: SortOption;
  searchQuery: string;
  page: number;
}

export interface CatalogFilterOption {
  id: string;
  label: string;
}

export interface CatalogMetadata {
  totalResults: number;
  totalPages: number;
  currentPage: number;
}
