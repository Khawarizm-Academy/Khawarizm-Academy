import React, { useState, useEffect } from 'react';
import { SmartSearchBox } from '../../../shared/components/Search/SmartSearchBox';
import { CatalogFilterSidebar } from '../components/CatalogFilterSidebar';
import { CatalogMobileFilterDrawer } from '../components/CatalogMobileFilterDrawer';
import { CatalogToolbar } from '../components/CatalogToolbar';
import { CatalogDataSection } from '../components/CatalogDataSection';
import { PageSkeleton } from '../../../shared/components/Loading/PageSkeleton';
import { useSearchParams } from '../../../app/routerContext';
import type { CatalogTab, CatalogFiltersState, SortOption } from '../types';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read active type and query from URL query params (?type=courses&q=...)
  const activeTab = (searchParams.get('type') as CatalogTab) || 'all';
  const initialQueryFromUrl = searchParams.get('q') || '';

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Demonstrate Tier 1 full-page skeleton on cold entry
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  }, []);

  // Master Filter State
  const [filters, setFilters] = useState<CatalogFiltersState>({
    type: activeTab,
    field: 'all',
    level: 'all',
    language: 'all',
    cost: 'all',
    country: 'all',
    status: 'all',
    sortBy: 'newest',
    searchQuery: initialQueryFromUrl,
    page: 1,
  });

  // Handle Tab Switch (All / Courses / Scholarships)
  const handleTabChange = (newTab: CatalogTab) => {
    setFilters((prev) => ({
      ...prev,
      type: newTab,
      page: 1,
      level: 'all',
    }));
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

    setFilters((prev) => ({
      ...prev,
      type: resolvedTab,
      searchQuery: query,
      page: 1,
    }));
    setSearchParams({
      type: resolvedTab,
      ...(query ? { q: query } : {}),
    });
  };

  const handleFilterChange = <K extends keyof CatalogFiltersState>(
    key: K,
    value: CatalogFiltersState[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to page 1 on filter change
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      type: activeTab,
      field: 'all',
      level: 'all',
      language: 'all',
      cost: 'all',
      country: 'all',
      status: 'all',
      sortBy: 'newest',
      searchQuery: '',
      page: 1,
    });
    setSearchParams({ type: activeTab });
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

  // If cold initial page load, render Tier 1 Full-Page Skeleton
  if (initialLoading) {
    return <PageSkeleton variant="catalog" />;
  }

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

        {/* Mobile 3-Way Tabs Switcher */}
        <div className="md:hidden w-full max-w-sm mt-3 p-1 bg-[#061A3A] rounded-full border border-[#1B3F80] flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleTabChange('scholarships')}
            className={`flex-1 py-1.5 text-xs font-semibold font-['Tajawal'] rounded-full transition-all cursor-pointer ${
              activeTab === 'scholarships'
                ? 'bg-[#E5B65C] text-[#040F24] font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المنح
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('courses')}
            className={`flex-1 py-1.5 text-xs font-semibold font-['Tajawal'] rounded-full transition-all cursor-pointer ${
              activeTab === 'courses'
                ? 'bg-[#29A9FF] text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الدورات
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`flex-1 py-1.5 text-xs font-semibold font-['Tajawal'] rounded-full transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-[#E5B65C] to-[#29A9FF] text-[#040F24] font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل
          </button>
        </div>

        {/* Smart Search Box */}
        <div className="w-full flex-center mt-3">
          <SmartSearchBox
            variant="desktop"
            initialType={activeTab === 'scholarships' ? 'scholarship' : 'course'}
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
            onSelectCard={(selected) => {
              alert(`عرض تفاصيل: ${selected.title}`);
            }}
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
