import React, { useState } from 'react';
import { SmartSearchBox } from '../../../shared/components/Search/SmartSearchBox';
import { CatalogFilterSidebar } from '../components/CatalogFilterSidebar';
import { CatalogMobileFilterDrawer } from '../components/CatalogMobileFilterDrawer';
import { CatalogToolbar } from '../components/CatalogToolbar';
import { CatalogDataSection } from '../components/CatalogDataSection';
import { useNavigate, useSearchParams } from '../../../app/routerContext';
import type { CatalogItem } from '../../../shared/data/mockCatalogData';
import type { CatalogTab, CatalogFiltersState, SortOption } from '../types';

// Non-pillar filters live in local state; `type` and `q` are URL-derived.
type PersistentFilters = Omit<CatalogFiltersState, 'type' | 'searchQuery'>;

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
  const handleSearch = (query: string, searchType?: 'all' | 'course' | 'scholarship') => {
    let resolvedTab: CatalogTab = activeTab;
    if (searchType === 'course') resolvedTab = 'courses';
    if (searchType === 'scholarship') resolvedTab = 'scholarships';
    if (searchType === 'all') resolvedTab = 'all';

    setPersistentFilters((prev) => ({ ...prev, page: 1 }));
    setSearchParams({
      type: resolvedTab,
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

  // Dynamic Headlines
  const pageTitles = {
    all: {
      title: 'دليل المعرفة والمنح الدولية',
      subtitle: 'البوابة الموحدة لاستكشاف أرقى الفرص التعليمية والمسارات الأكاديمية والمنح الممولة حول العالم.',
      countLabel: 'نتيجة منتقاة',
    },
    courses: {
      title: 'الدورات التدريبية والبرامج التعليمية',
      subtitle: 'مسارات تعليمية وتدريبية يقودها نخبة من الخبراء لتمكينك بالمهارات والشهادات الأكثر طلباً في سوق العمل.',
      countLabel: 'دورة تدريبية',
    },
    scholarships: {
      title: 'دليل المنح الدراسية والفرص الدولية',
      subtitle: 'بوابة المنح والفرص الأكاديمية العالمية الممولة بالكامل للطلاب والباحثين المتميزين.',
      countLabel: 'منحة دراسية',
    },
  }[activeTab];

  return (
    <main className="content-container">
      {/* 1. Hero Section (Header & Search) */}
      <section className="w-full flex-col-center text-center gap-3 pt-6 pb-2 animate-fade-in-up">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-['IBM_Plex_Sans_Arabic'] tracking-tight">
          {pageTitles.title}
        </h1>
        <p className="max-w-2xl text-slate-400 text-sm sm:text-base font-['Tajawal'] leading-relaxed">
          {pageTitles.subtitle}
        </p>

        {/* Desktop Smart Search Box (Inline 3-Segment Toggle: الكل / دورة / منحة) */}
        <div className="hidden md:flex w-full justify-center mt-4">
          <SmartSearchBox
            variant="desktop"
            selectedType={activeTab === 'courses' ? 'course' : activeTab === 'scholarships' ? 'scholarship' : 'all'}
            onTypeChange={(t) => handleTabChange(t === 'course' ? 'courses' : t === 'scholarship' ? 'scholarships' : 'all')}
            initialQuery={filters.searchQuery}
            onSearch={(q, t) => handleSearch(q, t)}
          />
        </div>

        {/* Mobile Smart Search Box (3-Way Switcher ON TOP + Clean Search Bar Below) */}
        <div className="flex md:hidden w-full justify-center mt-3">
          <SmartSearchBox
            variant="mobile"
            selectedType={activeTab === 'courses' ? 'course' : activeTab === 'scholarships' ? 'scholarship' : 'all'}
            onTypeChange={(t) => handleTabChange(t === 'course' ? 'courses' : t === 'scholarship' ? 'scholarships' : 'all')}
            initialQuery={filters.searchQuery}
            onSearch={(q, t) => handleSearch(q, t)}
          />
        </div>
      </section>

      {/* 2. Split Content Area (Sidebar Filters + Isolated Results Pane) */}
      <div className="w-full flex flex-col lg:flex-row items-start gap-8 animate-fade-in-up">
        {/* Main Results Pane (Left in RTL) */}
        <div className="flex-1 w-full flex flex-col gap-6">
          {/* Toolbar Row */}
          <CatalogToolbar
            totalCount={0}
            itemTypeLabel={pageTitles.countLabel}
            currentSort={filters.sortBy}
            onChangeSort={(sort: SortOption) => handleFilterChange('sortBy', sort)}
            onOpenMobileFilters={() => setIsFilterDrawerOpen(true)}
          />

          {/* Isolated Dynamic Data Boundary */}
          <CatalogDataSection
            filters={filters}
            activeTab={activeTab}
            onPageChange={(page) => handleFilterChange('page', page)}
            onResetFilters={handleResetFilters}
            onSelectCard={handleSelectCard}
          />
        </div>

        {/* Desktop Right Filter Sidebar (Start in RTL = Visual Right) */}
        <aside className="hidden lg:block shrink-0 sticky top-20">
          <CatalogFilterSidebar
            type={activeTab}
            filters={filters}
            onChangeFilter={handleFilterChange}
            onReset={handleResetFilters}
          />
        </aside>
      </div>

      {/* 3. Mobile Filter Drawer */}
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
