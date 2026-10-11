import React from 'react';
import { CircleAlert, SearchX } from 'lucide-react';
import { CatalogCard } from '@/features/catalog/components/cards/CatalogCard';
import { CatalogPagination } from '@/features/catalog/components/toolbar/CatalogPagination';
import { CatalogGridSkeleton } from '@/features/catalog/components/states/CatalogGridSkeleton';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { dataCacheManager } from '@/shared/lib/cacheManager';
import { mockCatalogAll, type CatalogItem } from '@/shared/mocks/catalog';
import type { CatalogFiltersState, CatalogTab } from '@/features/catalog/types';

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

/** Pure filter + sort + pagination engine; the caller caches its result. */
function computeFilteredCatalog(filters: CatalogFiltersState, activeTab: CatalogTab): FilterResult {
  const filtered = mockCatalogAll.filter((item) => {
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

/** The only part of the page that re-renders on data/filter changes; surrounding chrome stays stable. */
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

  // Cold miss waits 200ms so the Tier 2 skeleton is visible.
  const fetcher = async (): Promise<FilterResult> => {
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
    <div className="catalog-data">
      {/* Revalidation shimmer while a new filter set loads */}
      {isFetching && !isLoading && <div className="catalog-revalidation-line" aria-hidden="true" />}

      {isLoading ? (
        <CatalogGridSkeleton count={6} />
      ) : isError ? (
        /* Error state with retry */
        <div className="glass-panel catalog-state">
          <div className="catalog-state-icon text-danger-500">
            <CircleAlert size={32} />
          </div>
          <h3 className="catalog-state-title">تعذر تحميل النتائج</h3>
          <p className="catalog-state-text">
            {error?.message || 'حدث خطأ أثناء جلب البيانات. حاول مرة أخرى.'}
          </p>
          <button type="button" onClick={() => refetch()} className="btn-outline-blue text-xs mt-2">
            إعادة المحاولة
          </button>
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="catalog-grid">
            {data.items.map((item, index) => (
              <CatalogCard
                key={item.id}
                item={item}
                index={index}
                onSelect={onSelectCard}
                onPrefetch={() => handlePrefetchDetail(item)}
              />
            ))}
          </div>

          {data.totalPages > 1 && (
            <CatalogPagination
              currentPage={data.currentPage}
              totalPages={data.totalPages}
              onPageChange={onPageChange}
            />
          )}
        </>
      ) : (
        /* Empty state */
        <div className="glass-panel catalog-state">
          <div className="catalog-state-icon text-gold-400">
            <SearchX size={32} />
          </div>
          <h3 className="catalog-state-title">لم يتم العثور على نتائج تطابق معايير البحث</h3>
          <p className="catalog-state-text">
            جرب تغيير كلمات البحث أو إعادة ضبط الفلاتر لاستعراض جميع الدورات والمنح المتاحة.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="btn-gold text-xs mt-2"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>
      )}
    </div>
  );
};
