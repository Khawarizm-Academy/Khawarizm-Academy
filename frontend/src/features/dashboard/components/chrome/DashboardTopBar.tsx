import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { SmartSearchBox } from '@/shared/components/Search/SmartSearchBox';
import { DASHBOARD_TOP_BAR_TABS, NAV_TARGETS } from '@/shared/lib/navigation';
import { toArabicNav } from '@/shared/lib/localization';

/**
 * Slim global navigator pinned above the dashboard content: a quick-search pill
 * on the start edge and the shared top-level tabs on the end edge.
 */
export const DashboardTopBar: React.FC = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header dir="rtl" className="dash-topbar animate-fade-in-down">
        {/* Cyan hairline tying the bar into the celestial chrome */}
        <span className="dash-topbar-hairline" aria-hidden="true" />

        {/* Quick search pill (start edge in RTL) */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          title="بحث في الأكاديمية"
          className="dash-topbar-search group"
        >
          <Search size={15} strokeWidth={2.2} className="dash-topbar-search-glyph" />
          <span className="dash-topbar-search-label">بحث سريع</span>
        </button>

        {/* Global navigation tabs (end edge in RTL) */}
        <nav className="dash-topbar-nav" aria-label="التنقل العام">
          {DASHBOARD_TOP_BAR_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigate(NAV_TARGETS[tab.key])}
                className="dash-topbar-tab"
              >
                <TabIcon size={16} strokeWidth={2} className="dash-topbar-tab-icon" />
                <span>{toArabicNav(tab.key)}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Search modal overlay */}
      {isSearchOpen && (
        <div className="dash-search-overlay" onClick={() => setIsSearchOpen(false)}>
          <div className="dash-search-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-200 font-bold font-display text-lg">
                البحث السريع في الأكاديمية
              </h3>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-navy-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <SmartSearchBox
              initialQuery=""
              onSearch={(query, type) => {
                setIsSearchOpen(false);
                const queryParam = query ? `q=${encodeURIComponent(query)}` : '';
                const typeParam =
                  type !== 'all' ? `type=${type === 'course' ? 'courses' : 'scholarships'}` : '';
                const params = [queryParam, typeParam].filter(Boolean).join('&');
                navigate(`/catalog${params ? `?${params}` : ''}`);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};
