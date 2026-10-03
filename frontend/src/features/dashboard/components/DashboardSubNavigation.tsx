import React from 'react';

interface DashboardSubNavigationProps {
  activeView: string;
  onSelectView: (viewId: string) => void;
  className?: string;
}

export const DashboardSubNavigation: React.FC<DashboardSubNavigationProps> = ({
  activeView,
  onSelectView,
  className = '',
}) => {
  const tabs = [
    { id: 'main', label: 'نظرة عامة' },
    { id: 'enrolled', label: 'الدورات المسجّلة' },
    { id: 'profile', label: 'الملف الشخصي' },
  ];

  return (
    <div
      dir="rtl"
      role="tablist"
      aria-label="التنقل الداخلي للوحة التحكم"
      className={`self-stretch p-1 bg-slate-900 rounded-full outline outline-1 outline-offset-[-1px] outline-blue-900/80 inline-flex justify-start items-center gap-1 select-none shadow-[0px_4px_16px_rgba(0,0,0,0.2)] ${className}`}
    >
      {tabs.map((tab) => {
        const isActive =
          (tab.id === 'main' && (activeView === 'main' || activeView === 'overview' || activeView === 'live')) ||
          (tab.id === 'enrolled' && (activeView === 'enrolled' || activeView === 'courses')) ||
          (tab.id === 'profile' && activeView === 'profile');

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectView(tab.id)}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-full inline-flex flex-col justify-center items-center transition-all duration-200 cursor-pointer text-xs sm:text-sm font-['Tajawal'] ${
              isActive
                ? 'bg-blue-950 outline outline-1 outline-offset-[-1px] outline-sky-400 text-white font-bold shadow-[0_0_12px_rgba(41,169,255,0.25)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
