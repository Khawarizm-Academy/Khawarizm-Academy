import React, { useState } from 'react';
import { SmartSearchBox } from '../../../shared/components/Search/SmartSearchBox';
import { CatalogFilterSidebar } from '../components/CatalogFilterSidebar';
import { CatalogMobileFilterDrawer } from '../components/CatalogMobileFilterDrawer';
import { CatalogToolbar } from '../components/CatalogToolbar';
import { CatalogDataSection } from '../components/CatalogDataSection';
import { useNavigate, useSearchParams } from '../../../app/routerContext';
import catalogJson from '../../../shared/json/catalog.json';
import type { CatalogItem } from '../../../mocks/catalog';
import type { CatalogTab, CatalogFiltersState, SortOption } from '../types';

// Non-pillar filters live in local state; `type` and `q` are URL-derived.
type PersistentFilters = Omit<CatalogFiltersState, 'type' | 'searchQuery'>;

type SearchType = 'all' | 'course' | 'scholarship';

/** The search box speaks SearchType, the URL speaks CatalogTab. */
const SEARCH_TYPE_BY_TAB = catalogJson.searchTypeByTab as Record<CatalogTab, SearchType>;
const TAB_BY_SEARCH_TYPE = catalogJson.tabBySearchType as Record<SearchType, CatalogTab>;

const DEFAULT_FILTERS: PersistentFilters = {
  field: 'all',
  level: 'all',
  language: 'all',
  cost: 'all',
  country: 'all',
  status: 'all',
  sortBy: 'newest',
  page: 1,
};

export const CatalogPage: React.FC = () => {
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

// Handle Tab Switch (All / Courses / Scholarships)
  const handleTabChange = (newTab: CatalogTab) => {
    setPersistentFilters((prev) => ({ ...prev, page: 1, level: 'all' }));
    setSearchParams({
      type: newTab,
      ...(filters.searchQuery ? { q: filters.searchQuery } : {}),
    });
  };

  // Handle search submit from SmartSearchBox
  const handleSearch = (query: string, searchType?: SearchType) => {
    setPersistentFilters((prev) => ({ ...prev, page: 1 }));
    setSearchParams({
      type: searchType ? TAB_BY_SEARCH_TYPE[searchType] : activeTab,
      ...(query ? { q: query } : {}),
    });
  };

  const handleFilterChange = <K extends keyof CatalogFiltersState>(
    key: K,
    value: CatalogFiltersState[K]
  ) => {
    // `type` and `q` are URL-derived — the filter UI never touches them.
    if (key === 'type' || key === 'searchQuery') return;
    setPersistentFilters((prev) => ({ ...prev, [key]: value, page: 1 }) as PersistentFilters);
  };

  const handleResetFilters = () => {
    setPersistentFilters(DEFAULT_FILTERS);
    setSearchParams({ type: activeTab });
  };

  const handleSelectCard = (selected: CatalogItem) => {
    if (selected.type === 'course') navigate(`/courses/${selected.id}`);
    else navigate(`/scholarships/${selected.id}`);
  };

  const pageTitles = catalogJson.pageTitles[activeTab];

  return (
    <main className="content-container">
      {/* Hero section */}
      <section className="w-full flex-col-center text-center gap-3 pt-6 pb-2 animate-fade-in-up">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-['IBM_Plex_Sans_Arabic'] tracking-tight">
          {pageTitles.title}
        </h1>
        <p className="max-w-2xl text-slate-400 text-sm sm:text-base font-['Tajawal'] leading-relaxed">
          {pageTitles.subtitle}
        </p>

        {/* Desktop and mobile search boxes differ only in layout */}
        <div className="hidden md:flex w-full justify-center mt-4">
          <SmartSearchBox
            variant="desktop"
            selectedType={SEARCH_TYPE_BY_TAB[activeTab]}
            onTypeChange={(t) => handleTabChange(TAB_BY_SEARCH_TYPE[t])}
            initialQuery={filters.searchQuery}
            onSearch={handleSearch}
          />
        </div>

        <div className="flex md:hidden w-full justify-center mt-3">
          <SmartSearchBox
            variant="mobile"
            selectedType={SEARCH_TYPE_BY_TAB[activeTab]}
            onTypeChange={(t) => handleTabChange(TAB_BY_SEARCH_TYPE[t])}
            initialQuery={filters.searchQuery}
            onSearch={handleSearch}
          />
        </div>
      </section>

      {/* Results and filters */}
      <div className="w-full flex flex-col lg:flex-row items-start gap-8 animate-fade-in-up">
        {/* Results */}
        <div className="flex-1 w-full flex flex-col gap-6">
          <CatalogToolbar
            totalCount={0}
            itemTypeLabel={pageTitles.countLabel}
            currentSort={filters.sortBy}
            onChangeSort={(sort: SortOption) => handleFilterChange('sortBy', sort)}
            onOpenMobileFilters={() => setIsFilterDrawerOpen(true)}
          />

          <CatalogDataSection
            filters={filters}
            activeTab={activeTab}
            onPageChange={(page) => handleFilterChange('page', page)}
            onResetFilters={handleResetFilters}
            onSelectCard={handleSelectCard}
          />
        </div>

        <aside className="hidden lg:block shrink-0 sticky top-20">
          <CatalogFilterSidebar
            type={activeTab}
            filters={filters}
            onChangeFilter={handleFilterChange}
            onReset={handleResetFilters}
          />
        </aside>
      </div>

      <CatalogMobileFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        type={activeTab}
        filters={filters}
        onChangeFilter={handleFilterChange}
        onReset={handleResetFilters}
      />
    </main>
  );
};
