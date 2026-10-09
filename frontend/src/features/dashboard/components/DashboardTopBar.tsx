import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from '../../../app/routerContext';
import { SmartSearchBox } from '../../../shared/components/Search/SmartSearchBox';
import { DASHBOARD_TOP_BAR_TABS, NAV_TARGETS } from '../../../shared/lib/navigation';
import { toArabicNav } from '../../../shared/lib/localization';

export const DashboardTopBar: React.FC = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header dir="rtl" className="dash-topbar">
        {/* Circular search icon */}
        <div className="flex justify-start items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            title="بحث في الأكاديمية"
            className="dash-topbar-search group"
          >
            <Search
              size={15}
              strokeWidth={2.2}
              className="text-slate-400 group-hover:text-sky-300 transition-colors"
            />
          </button>
        </div>

        {/* Global navigation links */}
        <nav className="flex justify-start items-center gap-6">
          {DASHBOARD_TOP_BAR_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(NAV_TARGETS[tab.key])}
              className="dash-topbar-link"
            >
              {toArabicNav(tab.key)}
            </button>
          ))}
        </nav>
      </header>

      {/* Search modal overlay */}
      {isSearchOpen && (
        <div className="dash-search-overlay">
          <div className="dash-search-panel">
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
