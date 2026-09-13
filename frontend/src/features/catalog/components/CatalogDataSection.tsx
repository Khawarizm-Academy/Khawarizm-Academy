import React from 'react';
import { CatalogCard } from './CatalogCard';
import { CatalogPagination } from './CatalogPagination';
import { CatalogGridSkeleton } from './CatalogGridSkeleton';
import { useCachedData } from '../../../shared/hooks/useCachedData';
import { dataCacheManager } from '../../../shared/lib/cacheManager';
import { mockCatalogAll, type CatalogItem } from '../../../shared/data/mockCatalogData';
import type { CatalogFiltersState, CatalogTab } from '../types';

interface CatalogDataSectionProps {
  filters: CatalogFiltersState;
  activeTab: CatalogTab;
  onPageChange: (page: number) => void;
  onResetFilters: () => void;
  onSelectCard: (item: CatalogItem) => void;
}

interface FilterResult {
  items: CatalogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const ITEMS_PER_PAGE = 6;

/**
 * Filter evaluation engine — pure computation cached in memory
 */
function computeFilteredCatalog(filters: CatalogFiltersState, activeTab: CatalogTab): FilterResult {
  const filtered = mockCatalogAll.filter((item) => {
    // 1. Pillar Type Filter
    if (activeTab === 'courses' && item.type !== 'course') return false;
    if (activeTab === 'scholarships' && item.type !== 'scholarship') return false;

    // 2. Search Query Filter
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchInst = item.instructor?.toLowerCase().includes(q);
      const matchProv = item.provider?.toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchInst && !matchProv) return false;
    }

    // 3. Field Filter
    if (filters.field !== 'all' && item.categorySlug !== filters.field) {
      return false;
    }

    // 4. Level Filter
    if (filters.level !== 'all') {
      if (item.type === 'course' && item.courseLevel !== filters.level) return false;
      if (item.type === 'scholarship' && item.degreeLevel !== filters.level) return false;
    }

    // 5. Cost Filter (Courses)
    if (filters.cost !== 'all' && item.type === 'course' && item.priceType !== filters.cost) {
      return false;
    }

    // 6. Country Filter (Scholarships)
    if (filters.country !== 'all' && item.type === 'scholarship' && item.countrySlug !== filters.country) {
      return false;
    }

    // 7. Status Filter (Scholarships)
    if (filters.status !== 'all' && item.type === 'scholarship' && item.status !== filters.status) {
      return false;
    }

    return true;
  }).sort((a, b) => {
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
  const items = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return {
    items,
    totalCount: filtered.length,
    totalPages,
    currentPage,
  };
}

/**
 * Isolated Dynamic Data Boundary Component.
 *
 * ONLY this component re-renders when data updates, filters change, or pagination shifts.
 * Surrounding page controls (Hero, Search Box, Filter Sidebar, Toolbar) remain completely stable.
 */
export const CatalogDataSection: React.FC<CatalogDataSectionProps> = ({
  filters,
  activeTab,
  onPageChange,
  onResetFilters,
  onSelectCard,
}) => {
  // Key incorporates all active filters deterministically
  const cacheKey = [
    'catalog-data-section',
    {
      activeTab,
      field: filters.field,
      level: filters.level,
      language: filters.language,
      cost: filters.cost,
      country: filters.country,
      status: filters.status,
      sortBy: filters.sortBy,
      searchQuery: filters.searchQuery,
      page: filters.page,
    },
  ];

  // Fast fetcher with simulated micro-latency on cold miss to demonstrate Tier 2 skeleton
  const fetcher = async (): Promise<FilterResult> => {
    // Artificial small delay (200ms) on cold misses to make Tier 2 skeleton visible
    await new Promise((res) => setTimeout(res, 200));
    return computeFilteredCatalog(filters, activeTab);
  };

  const { data, isLoading, isFetching, isError, error, refetch } = useCachedData<FilterResult>(cacheKey, fetcher, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    keepPreviousData: true, // keep old cards mounted while a new filter combination loads
  });

  // Warm the detail-page cache on card hover -> instant detail navigation.
  const handlePrefetchDetail = (item: CatalogItem) => {
    dataCacheManager.prefetch(['catalog-detail', item.id], async () => {
      await new Promise((res) => setTimeout(res, 1));
      return item;
    });
  };

  return (
    <div className="w-full flex flex-col gap-6 relative">
      {/* Background Revalidation Indicator (Starlight Shimmer Line) */}
      {isFetching && !isLoading && (
        <div
          className="absolute -top-3 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#29A9FF] to-transparent animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Tier 2 Data-Section Skeleton during cold query */}
      {isLoading ? (
        <CatalogGridSkeleton count={6} />
      ) : isError ? (
        /* Error State with Retry */
        <div className="w-full py-16 px-6 glass-panel rounded-2xl flex-col-center text-center gap-4 border border-[#1B3F80]">
          <div className="w-16 h-16 rounded-full bg-[#092557] border border-[#1B3F80] flex-center text-[#D9534F]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white font-['IBM_Plex_Sans_Arabic']">
            تعذر تحميل النتائج
          </h3>
          <p className="text-slate-400 text-sm font-['Tajawal'] max-w-md">
            {error?.message || 'حدث خطأ أثناء جلب البيانات. حاول مرة أخرى.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-outline-blue py-2 px-6 text-xs font-bold mt-2"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          {/* Active Cards Grid */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
            {data.items.map((item) => (
              <CatalogCard
                key={item.id}
                item={item}
                onSelect={onSelectCard}
                onPrefetch={() => handlePrefetchDetail(item)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {data.totalPages > 1 && (
            <CatalogPagination
              currentPage={data.currentPage}
              totalPages={data.totalPages}
              onPageChange={onPageChange}
            />
          )}
        </>
      ) : (
        /* Empty State */
        <div className="w-full py-16 px-6 glass-panel rounded-2xl flex-col-center text-center gap-4 border border-[#1B3F80]">
          <div className="w-16 h-16 rounded-full bg-[#092557] border border-[#1B3F80] flex-center text-[#E5B65C]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white font-['IBM_Plex_Sans_Arabic']">
            لم يتم العثور على نتائج تطابق معايير البحث
          </h3>
          <p className="text-slate-400 text-sm font-['Tajawal'] max-w-md">
            جرب تغيير كلمات البحث أو إعادة ضبط الفلاتر لاستعراض جميع الدورات والمنح المتاحة.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="btn-gold py-2 px-6 text-xs font-bold mt-2"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>
      )}
    </div>
  );
};
