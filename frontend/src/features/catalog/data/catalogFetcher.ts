import { apiGet, buildQuery, isMockApi } from '@/shared/lib/apiClient';
import { mockCatalogAll, type CatalogItem } from '@/shared/mocks/catalog';
import type { CatalogFiltersState, CatalogTab } from '@/features/catalog/types';

/** The paged result the catalog section renders. */
export interface CatalogPage {
  items: CatalogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const ITEMS_PER_PAGE = 6;

/** Mock-mode filter + sort + pagination engine (kept identical to the old inline one). */
function computeFilteredCatalog(filters: CatalogFiltersState, activeTab: CatalogTab): CatalogPage {
  const filtered = mockCatalogAll
    .filter((item) => {
      if (activeTab === 'courses' && item.type !== 'course') return false;
      if (activeTab === 'scholarships' && item.type !== 'scholarship') return false;

      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        const matchInst = item.instructor?.toLowerCase().includes(q);
        const matchProv = item.provider?.toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchInst && !matchProv) return false;
      }

      if (filters.field !== 'all' && item.categorySlug !== filters.field) {
        return false;
      }

      if (filters.level !== 'all') {
        if (item.type === 'course' && item.courseLevel !== filters.level) return false;
        if (item.type === 'scholarship' && item.degreeLevel !== filters.level) return false;
      }

      if (filters.cost !== 'all' && item.type === 'course' && item.priceType !== filters.cost) {
        return false;
      }

      if (filters.country !== 'all' && item.type === 'scholarship' && item.countrySlug !== filters.country) {
        return false;
      }

      if (filters.status !== 'all' && item.type === 'scholarship' && item.status !== filters.status) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (filters.sortBy === 'deadline') {
        return (a.daysRemaining || 999) - (b.daysRemaining || 999);
      }
      return 0; // default newest
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(filters.page, totalPages);
  const items = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return { items, totalCount: filtered.length, totalPages, currentPage };
}

/** One page of catalog results: server-side in live mode, in-memory in mock mode. */
export async function fetchCatalogPage(filters: CatalogFiltersState, activeTab: CatalogTab): Promise<CatalogPage> {
  if (!isMockApi) {
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

  // Cold miss waits 200ms so the Tier 2 skeleton is visible.
  await new Promise((res) => setTimeout(res, 200));
  return computeFilteredCatalog(filters, activeTab);
}
