import React from 'react';
import { CircleAlert, SearchX } from 'lucide-react';
import { CatalogCard } from '@/features/catalog/components/cards/CatalogCard';
import { CatalogPagination } from '@/features/catalog/components/toolbar/CatalogPagination';
import { CatalogGridSkeleton } from '@/features/catalog/components/states/CatalogGridSkeleton';
import { fetchCourseDetail } from '@/features/courses/data/courseFetchers';
import { fetchCatalogPage, type CatalogPage } from '@/features/catalog/data/catalogFetcher';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { dataCacheManager } from '@/shared/lib/cacheManager';
import type { CatalogItem } from '@/shared/mocks/catalog';
import type { CatalogFiltersState, CatalogTab } from '@/features/catalog/types';

interface CatalogDataSectionProps {
  filters: CatalogFiltersState;
  activeTab: CatalogTab;
  onPageChange: (page: number) => void;
  onResetFilters: () => void;
  onSelectCard: (item: CatalogItem) => void;
}

/** Detail cache key per catalog family: courses merge seed data, scholarships reuse the base. */
const DETAIL_KEY: Record<'course' | 'scholarship', string> = {
  course: 'course-detail',
  scholarship: 'catalog-detail',
};

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

  const fetcher = () => fetchCatalogPage(filters, activeTab);

  const { data, isLoading, isFetching, isError, error, refetch } = useCachedData<CatalogPage>(cacheKey, fetcher, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    keepPreviousData: true, // keep old cards mounted while a new filter combination loads
  });

  // Warm the detail-page cache on card hover -> instant detail navigation.
  const handlePrefetchDetail = (item: CatalogItem) => {
    const key = DETAIL_KEY[item.type];
    dataCacheManager.prefetch([key, item.id], async () => {
      if (item.type === 'course') return fetchCourseDetail(item.id);
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
