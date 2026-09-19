import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from '../../../app/routerContext';
import { SmartSearchBox } from '../../../shared/components/Search/SmartSearchBox';

export const DashboardTopBar: React.FC = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navLinks = [
    { label: 'الرئيسية', path: '/' },
    { label: 'الدورات', path: '/catalog?type=courses' },
    { label: 'المنح والفرص', path: '/catalog?type=scholarships' },
    { label: 'الفعاليات', path: '/events' },
    { label: 'المسابقات', path: '/competitions' },
  ];

  return (
    <>
      <header
        dir="rtl"
        data-layer="Top-Bar"
        className="TopBar self-stretch h-12 px-6 bg-slate-900/90 border-b border-blue-900/80 backdrop-blur-md hidden md:flex justify-between items-center z-20 shrink-0 select-none"
      >
        {/* 1. Right side in RTL: Circular Search Icon (aligned above greeting and sidebar) */}
        <div data-layer="Search" className="Search flex justify-start items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            data-layer="Search-Icon"
            title="بحث في الأكاديمية"
            className="SearchIcon size-8 bg-blue-950 hover:bg-blue-900/80 rounded-full outline outline-1 outline-offset-[-1px] outline-blue-900 hover:outline-sky-400 flex flex-col justify-center items-center cursor-pointer transition-all shadow-sm group"
          >
            <Search size={15} className="text-[#8299B5] group-hover:text-sky-300 transition-colors" strokeWidth={2.2} />
          </button>
        </div>

        {/* 2. Left side in RTL: Global Navigation Links */}
        <nav data-layer="Nav-Links" className="NavLinks flex justify-start items-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => navigate(link.path)}
              data-layer={link.label}
              className="text-slate-400 hover:text-slate-200 text-sm font-medium font-['Tajawal'] transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Search Modal Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-blue-900/80 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-200 font-bold font-['Cairo'] text-lg">البحث السريع في الأكاديمية</h3>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
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
