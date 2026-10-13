import { apiGet, buildQuery } from '@/shared/lib/apiClient';
import type { CatalogItem } from '@/shared/types/entities';
import type { CatalogFiltersState, CatalogTab } from '@/features/catalog/types';

/** The paged result the catalog section renders. */
export interface CatalogPage {
  items: CatalogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/** One page of catalog results; filtering, sorting, and paging happen on the server. */
export async function fetchCatalogPage(filters: CatalogFiltersState, activeTab: CatalogTab): Promise<CatalogPage> {
  const query = buildQuery({
    type: activeTab,
    q: filters.searchQuery,
    field: filters.field,
    level: filters.level,
    language: filters.language,
    cost: filters.cost,
    country: filters.country,
    status: filters.status,
    sort: filters.sortBy,
    page: filters.page,
  });
  const data = await apiGet<{
    items: CatalogItem[];
    totalResults: number;
    totalPages: number;
    currentPage: number;
  }>(`/catalog${query}`);

  return {
    items: data.items,
    totalCount: data.totalResults,
    totalPages: data.totalPages,
    currentPage: data.currentPage,
  };
}