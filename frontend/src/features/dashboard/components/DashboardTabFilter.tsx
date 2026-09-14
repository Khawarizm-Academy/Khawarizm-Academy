import React from 'react';
import type { DashboardView, DashboardState } from '../types';

interface DashboardTabFilterProps {
  currentView: DashboardView;
  currentState: DashboardState;
  onViewChange: (view: DashboardView) => void;
  onStateChange: (state: DashboardState) => void;
}

export const DashboardTabFilter: React.FC<DashboardTabFilterProps> = ({
  currentView,
  currentState,
  onViewChange,
  onStateChange,
}) => {
  const views = [
    { id: 'overview' as const, label: 'لوحتي الرئيسية' },
    { id: 'saved' as const, label: 'المنح والمفضلة' },
    { id: 'achievements' as const, label: 'إنجازاتي وتحدياتي' },
  ];

  const states = [
    { id: 'active' as const, label: 'متابعة التعلم', icon: '📚' },
    { id: 'live' as const, label: 'جلسة مباشرة تبدأ قريبًا', icon: '🔴' },
    { id: 'empty' as const, label: 'حساب جديد (فارغ)', icon: '✨' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-y border-[#1B3F80]/30 my-4">
      {/* 1. Main Navigation View Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {views.map((tab) => {
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-['Tajawal',sans-serif] font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-[#167BDB]/25 to-[#29A9FF]/30 text-[#29A9FF] border border-[#29A9FF]/60 shadow-[0_0_12px_rgba(41,169,255,0.25)]'
                  : 'text-[#8299B5] hover:text-[#DCE5EE] hover:bg-[#061A3A]/60 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2. Dynamic State Quick-Toggle (Allows effortless test of Live Session, Continue Learning & Empty state) */}
      <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#040F24]/80 p-1 rounded-xl border border-[#167BDB]/20 text-[11px] font-['Tajawal']">
        <span className="text-[#8299B5] px-2 hidden lg:inline font-medium">حالة اللوحة:</span>
        {states.map((st) => {
          const isActive = currentState === st.id;
          return (
            <button
              key={st.id}
              onClick={() => onStateChange(st.id)}
              className={`px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1 font-semibold ${
                isActive
                  ? 'bg-[#E5B65C]/20 text-[#E5B65C] border border-[#E5B65C]/50 shadow-[0_0_8px_rgba(229,182,92,0.3)]'
                  : 'text-[#8299B5] hover:text-[#DCE5EE] hover:bg-[#061A3A]'
              }`}
              title={`تبديل إلى ${st.label}`}
            >
              <span className="text-xs">{st.icon}</span>
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
