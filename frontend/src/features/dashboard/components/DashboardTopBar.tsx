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
      <header
        dir="rtl"
        className="self-stretch h-12 px-6 bg-slate-900/90 border-b border-blue-900/80 backdrop-blur-md hidden md:flex justify-between items-center z-20 shrink-0 select-none"
      >
        {/* Circular search icon */}
        <div className="flex justify-start items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            title="بحث في الأكاديمية"
            className="size-8 bg-blue-950 hover:bg-blue-900/80 rounded-full outline outline-1 outline-offset-[-1px] outline-blue-900 hover:outline-sky-400 flex flex-col justify-center items-center cursor-pointer transition-all shadow-sm group"
          >
            <Search size={15} className="text-[#8299B5] group-hover:text-sky-300 transition-colors" strokeWidth={2.2} />
          </button>
        </div>

        {/* Global navigation links */}
        <nav className="flex justify-start items-center gap-6">
          {DASHBOARD_TOP_BAR_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(NAV_TARGETS[tab.key])}
              className="text-slate-400 hover:text-slate-200 text-sm font-medium font-['Tajawal'] transition-colors cursor-pointer"
            >
              {toArabicNav(tab.key)}
            </button>
          ))}
        </nav>
      </header>

      {/* Search Modal Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-blue-900/80 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-200 font-bold font-['IBM_Plex_Sans_Arabic'] text-lg">البحث السريع في الأكاديمية</h3>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <SmartSearchBox
              initialQuery=""
              onSearch={(query, type) => {
                setIsSearchOpen(false);
                const queryParam = query ? `q=${encodeURIComponent(query)}` : '';
                const typeParam = type !== 'all' ? `type=${type === 'course' ? 'courses' : 'scholarships'}` : '';
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