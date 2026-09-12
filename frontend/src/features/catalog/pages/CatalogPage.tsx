import React, { useState, useMemo, useEffect } from 'react';
import { DesktopNavbar } from '../../../shared/components/Navbar/DesktopNavbar';
import { MobileHeader } from '../../../shared/components/Navbar/MobileHeader';
import { MobileBottomBar } from '../../../shared/components/BottomNav/MobileBottomBar';
import { Footer } from '../../../shared/components/Footer/Footer';
import { SmartSearchBox } from '../../../shared/components/Search/SmartSearchBox';
import { CatalogCard } from '../components/CatalogCard';
import { CatalogFilterSidebar } from '../components/CatalogFilterSidebar';
import { CatalogMobileFilterDrawer } from '../components/CatalogMobileFilterDrawer';
import { CatalogToolbar } from '../components/CatalogToolbar';
import { CatalogPagination } from '../components/CatalogPagination';
import { mockCatalogAll } from '../../../shared/data/mockCatalogData';
import { useSearchParams, useNavigate } from '../../../app/router';
import type { CatalogTab, CatalogFiltersState, SortOption } from '../types';
import type { NavTabKey } from '../../../shared/lib/localization';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read initial type and query from URL query params (?type=courses&q=...)
  const initialTypeFromUrl = (searchParams.get('type') as CatalogTab) || 'all';
  const initialQueryFromUrl = searchParams.get('q') || '';

  const [activeTab, setActiveTab] = useState<CatalogTab>(initialTypeFromUrl);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Synchronize state when URL query param changes
  useEffect(() => {
    const typeFromParam = (searchParams.get('type') as CatalogTab) || 'all';
    if (typeFromParam !== activeTab) {
      setActiveTab(typeFromParam);
    }
  }, [searchParams]);

  // Master Filter State
  const [filters, setFilters] = useState<CatalogFiltersState>({
    type: initialTypeFromUrl,
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
    setActiveTab(newTab);
    setFilters((prev) => ({
      ...prev,
      type: newTab,
      page: 1,
      // Reset contextual filters on major tab switch
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

    setActiveTab(resolvedTab);
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

  // Filter and Sort Engine
  const filteredItems = useMemo(() => {
    return mockCatalogAll.filter((item) => {
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
  }, [activeTab, filters]);

  // Pagination Slice
  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(filters.page, totalPages);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Dynamic Headlines matching Figma Mockups
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

  // Map active nav tab for Desktop and Mobile Navbar highlights
  const navbarActiveTab: NavTabKey =
    activeTab === 'courses' ? 'courses' : activeTab === 'scholarships' ? 'scholarships' : 'catalog';

  const handleNavSelect = (tab: NavTabKey) => {
    if (tab === 'home') navigate('/');
    else if (tab === 'courses') handleTabChange('courses');
    else if (tab === 'scholarships') handleTabChange('scholarships');
    else if (tab === 'catalog') handleTabChange('all');
  };

  return (
    <div className="page-wrapper">
      {/* Background Celestial Washes */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[8%] right-[5%] w-[650px] h-[650px] rounded-full bg-[#29A9FF]/[0.045] blur-[140px]" />
        <div className="absolute top-[28%] left-[5%] w-[550px] h-[550px] rounded-full bg-[#E5B65C]/[0.035] blur-[130px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full bg-[#167BDB]/[0.035] blur-[150px]" />
      </div>

      {/* 1. Header Navigation Shell */}
      <div className="w-full hidden md:block animate-fade-in-down relative z-20">
        <DesktopNavbar activeTab={navbarActiveTab} onSelectTab={handleNavSelect} />
      </div>
      <div className="w-full block md:hidden animate-fade-in-down relative z-20">
        <MobileHeader onLogoClick={() => navigate('/')} />
      </div>

      {/* 2. Main Content Container */}
      <main className="content-container">
        
        {/* 2.1 Hero Section */}
        <section className="w-full flex-col-center text-center gap-3 pt-6 pb-2 animate-fade-in-up animation-delay-100">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-['IBM_Plex_Sans_Arabic'] tracking-tight">
            {pageTitles.title}
          </h1>
          <p className="max-w-2xl text-slate-400 text-sm sm:text-base font-['Tajawal'] leading-relaxed">
            {pageTitles.subtitle}
          </p>

          {/* 2.2 Mobile 3-Way Tabs Switcher (matching Catalog - All - Mobile.html) */}
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

          {/* 2.3 Smart Search Box */}
          <div className="w-full flex-center mt-3">
            <SmartSearchBox
              variant="desktop"
              initialType={activeTab === 'scholarships' ? 'scholarship' : 'course'}
              initialQuery={filters.searchQuery}
              onSearch={(q, t) => handleSearch(q, t)}
            />
          </div>
        </section>

        {/* 2.4 Split Content Area (Sidebar Filters + Results Pane) */}
        <div className="w-full flex flex-col lg:flex-row items-start gap-8 animate-fade-in-up animation-delay-200">
          
          {/* Main Results Pane (Left in RTL) */}
          <div className="flex-1 w-full flex flex-col gap-6">
            {/* Toolbar Row */}
            <CatalogToolbar
              totalCount={filteredItems.length}
              itemTypeLabel={pageTitles.countLabel}
              currentSort={filters.sortBy}
              onChangeSort={(sort: SortOption) => handleFilterChange('sortBy', sort)}
              onOpenMobileFilters={() => setIsFilterDrawerOpen(true)}
            />

            {/* Results Grid / List */}
            {paginatedItems.length > 0 ? (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                {paginatedItems.map((item) => (
                  <CatalogCard
                    key={item.id}
                    item={item}
                    onSelect={(selected) => {
                      alert(`عرض تفاصيل: ${selected.title}`);
                    }}
                  />
                ))}
              </div>
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
                  onClick={handleResetFilters}
                  className="btn-gold py-2 px-6 text-xs font-bold mt-2"
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <CatalogPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => handleFilterChange('page', page)}
              />
            )}
          </div>

          {/* Desktop Right Filter Sidebar (Start in RTL = Visual Right) */}
          <div className="hidden lg:block shrink-0">
            <CatalogFilterSidebar
              type={activeTab}
              filters={filters}
              onChangeFilter={handleFilterChange}
              onReset={handleResetFilters}
            />
          </div>

        </div>
      </main>

      {/* 3. Mobile Filter Drawer */}
      <CatalogMobileFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        type={activeTab}
        filters={filters}
        onChangeFilter={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* 4. Global Footer (Desktop & Tablet) */}
      <div className="w-full hidden md:block animate-fade-in-up animation-delay-500 relative z-10">
        <Footer />
      </div>

      {/* 5. Mobile Bottom Bar */}
      <div className="block md:hidden relative z-30">
        <MobileBottomBar activeTab={navbarActiveTab} onSelectTab={handleNavSelect} />
      </div>
    </div>
  );
};
