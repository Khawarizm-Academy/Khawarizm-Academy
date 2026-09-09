import React from 'react';

export type ViewportMode = 'responsive' | 'desktop' | 'mobile';

interface ViewportToggleProps {
  currentMode: ViewportMode;
  onChangeMode: (mode: ViewportMode) => void;
}

export const ViewportToggle: React.FC<ViewportToggleProps> = ({
  currentMode,
  onChangeMode,
}) => {
  return (
    <aside aria-label="محدد العرض" className="fixed bottom-20 left-4 sm:left-6 z-50 bg-[#061A3A]/95 backdrop-blur-md p-1.5 rounded-full border border-[#1B3F80] shadow-[0_8px_30px_rgba(0,0,0,0.6)] flex items-center gap-1 font-['Tajawal'] text-xs">
      <button
        onClick={() => onChangeMode('desktop')}
        className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
          currentMode === 'desktop'
            ? 'bg-[#167BDB] text-white shadow-sm font-bold'
            : 'text-[#8299B5] hover:text-[#DCE5EE]'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </svg>
        <span>حاسوب</span>
      </button>

      <button
        onClick={() => onChangeMode('mobile')}
        className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
          currentMode === 'mobile'
            ? 'bg-[#E5B65C] text-[#040F24] shadow-sm font-bold'
            : 'text-[#8299B5] hover:text-[#DCE5EE]'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
          <line x1="12" x2="12.01" y1="18" y2="18" />
        </svg>
        <span>هاتف</span>
      </button>

      <button
        onClick={() => onChangeMode('responsive')}
        className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
          currentMode === 'responsive'
            ? 'bg-[#123168] text-[#29A9FF] border border-[#29A9FF]/40 font-bold'
            : 'text-[#8299B5] hover:text-[#DCE5EE]'
        }`}
      >
        <span>تلقائي</span>
      </button>
    </aside>
  );
};
