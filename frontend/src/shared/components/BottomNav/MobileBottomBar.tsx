import React from 'react';

interface MobileBottomBarProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeTab = 'لوحتي',
  onSelectTab,
}) => {
  const tabs = [
    {
      id: 'home',
      label: 'الرئيسية',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 'courses',
      label: 'الدورات',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      ),
    },
    {
      id: 'scholarships',
      label: 'المنح',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="6" />
          <path d="m15.477 12.89 2.523 7.11-6-3-6 3 2.523-7.11" />
        </svg>
      ),
    },
    {
      id: 'dashboard',
      label: 'لوحتي',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'حسابي',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  const activeIndex = tabs.findIndex((t) => t.label === activeTab);
  const safeIndex = activeIndex >= 0 ? activeIndex : 3;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-[#092557]/95 backdrop-blur-lg border-t border-[#1B3F80] shadow-[0_-4px_25px_rgba(0,0,0,0.6)]">
      <div className="max-w-md mx-auto h-16 px-2 grid grid-cols-5 relative items-center">
        
        {/* Physical Sliding Golden Chamber Indicator */}
        <div
          className="absolute top-2 bottom-2 rounded-xl bg-[#040F24] border border-[#E5B65C]/50 shadow-[0_0_16px_rgba(229,182,92,0.4)] pointer-events-none transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            width: 'calc(20% - 10px)',
            right: `calc(${safeIndex * 20}% + 5px)`,
          }}
        />

        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab?.(tab.label)}
              className={`relative z-10 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'text-[#E5B65C] scale-105'
                  : 'text-[#8299B5] hover:text-[#DCE5EE]'
              }`}
            >
              <div className="relative transition-transform duration-300">
                {tab.icon}
              </div>
              <span className={`text-[11px] font-['Tajawal'] font-medium mt-0.5 transition-colors duration-300 ${
                isActive ? 'font-bold text-[#E5B65C] drop-shadow-[0_0_8px_rgba(229,182,92,0.5)]' : ''
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
