import React, { useState } from 'react';
import { toArabic } from '../../lib/localization';

export interface SmartSearchBoxProps {
  variant?: 'desktop' | 'mobile';
  initialType?: 'course' | 'scholarship' | 'all';
  selectedType?: 'course' | 'scholarship' | 'all';
  onTypeChange?: (type: 'course' | 'scholarship' | 'all') => void;
  initialQuery?: string;
  onSearch?: (query: string, type: 'course' | 'scholarship' | 'all') => void;
  className?: string;
}

export const SmartSearchBox: React.FC<SmartSearchBoxProps> = ({
  variant = 'desktop',
  initialType = 'all',
  selectedType: controlledType,
  onTypeChange,
  initialQuery = '',
  onSearch,
  className = '',
}) => {
  const isControlled = controlledType !== undefined;
  const [internalSelectedType, setInternalSelectedType] = useState<'course' | 'scholarship' | 'all'>(
    initialType || 'all'
  );

  const [prevInitialType, setPrevInitialType] = useState(initialType);
  if (!isControlled && initialType !== prevInitialType) {
    setPrevInitialType(initialType);
    setInternalSelectedType(initialType || 'all');
  }

  const currentType = isControlled ? controlledType : internalSelectedType;

  const handleTypeSelect = (type: 'course' | 'scholarship' | 'all') => {
    if (!isControlled) {
      setInternalSelectedType(type);
    }
    onTypeChange?.(type);
  };

  const [query, setQuery] = useState(initialQuery);
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    setQuery(initialQuery);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query, currentType);
  };

  // Compass / Astrolabe SVG Icon
  const CompassIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-5 h-5 transition-transform duration-500 group-hover:rotate-45">
      <path
        d="M5.5 14.5L12.5 12.5L14.5 5.5L7.5 7.5L5.5 14.5ZM10 11.5C9.58333 11.5 9.22917 11.3542 8.9375 11.0625C8.64583 10.7708 8.5 10.4167 8.5 10C8.5 9.58333 8.64583 9.22917 8.9375 8.9375C9.22917 8.64583 9.58333 8.5 10 8.5C10.4167 8.5 10.7708 8.64583 11.0625 8.9375C11.3542 9.22917 11.5 9.58333 11.5 10C11.5 10.4167 11.3542 10.7708 11.0625 11.0625C10.7708 11.3542 10.4167 11.5 10 11.5ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2167 18 14.1042 17.2208 15.6625 15.6625C17.2208 14.1042 18 12.2167 18 10C18 7.78333 17.2208 5.89583 15.6625 4.3375C14.1042 2.77917 12.2167 2 10 2C7.78333 2 5.89583 2.77917 4.3375 4.3375C2.77917 5.89583 2 7.78333 2 10C2 12.2167 2.77917 14.1042 4.3375 15.6625C5.89583 17.2208 7.78333 18 10 18Z"
        fill="currentColor"
      />
    </svg>
  );

  // Mobile Puck Position Calculation (3 Options in RTL: all (right) -> course (center) -> scholarship (left))
  const getMobilePuckStyle = (type: 'all' | 'course' | 'scholarship') => {
    switch (type) {
      case 'all':
        return { right: '4px', width: 'calc(33.333% - 2.67px)' };
      case 'course':
        return { right: 'calc(33.333% + 1.33px)', width: 'calc(33.333% - 2.67px)' };
      case 'scholarship':
        return { right: 'calc(66.666% - 1.33px)', width: 'calc(33.333% - 2.67px)' };
    }
  };

  // Desktop Puck Position Calculation (3 Options in RTL: all (right) -> course (center) -> scholarship (left))
  const getDesktopPuckStyle = (type: 'all' | 'course' | 'scholarship') => {
    switch (type) {
      case 'all':
        return { right: '4px', width: 'calc(33.333% - 2.67px)' };
      case 'course':
        return { right: 'calc(33.333% + 1.33px)', width: 'calc(33.333% - 2.67px)' };
      case 'scholarship':
        return { right: 'calc(66.666% - 1.33px)', width: 'calc(33.333% - 2.67px)' };
    }
  };

  // Mobile Variant: 3-Way Switcher on TOP + Clean Spacious Search Input Below (Old cramped buttons removed)
  if (variant === 'mobile') {
    return (
      <div className={`w-full max-w-sm mx-auto flex flex-col items-center gap-3.5 ${className}`}>
        {/* Top 3-Way Switcher: Same style, shape, and look matching the celestial design system */}
        <div className="w-full p-1 bg-[#061A3A]/90 backdrop-blur-md rounded-full border border-[#1B3F80] shadow-[0_4px_20px_rgba(4,15,36,0.6)] flex items-center relative select-none">
          {/* Physical Sliding Highlight Puck */}
          <div
            className={`absolute top-1 bottom-1 rounded-full pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              currentType === 'all'
                ? 'bg-gradient-to-r from-[#E5B65C] to-[#29A9FF] shadow-[0_0_14px_rgba(41,169,255,0.4)]'
                : currentType === 'course'
                ? 'bg-[#29A9FF] shadow-[0_0_14px_rgba(41,169,255,0.5)]'
                : 'bg-[#E5B65C] shadow-[0_0_14px_rgba(229,182,92,0.5)]'
            }`}
            style={getMobilePuckStyle(currentType)}
          />

          <button
            type="button"
            onClick={() => handleTypeSelect('all')}
            className={`relative z-10 flex-1 py-1.5 text-center rounded-full text-xs font-['Tajawal'] font-bold transition-colors duration-300 cursor-pointer ${
              currentType === 'all' ? 'text-[#040F24] font-extrabold' : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => handleTypeSelect('course')}
            className={`relative z-10 flex-1 py-1.5 text-center rounded-full text-xs font-['Tajawal'] font-bold transition-colors duration-300 cursor-pointer ${
              currentType === 'course' ? 'text-white font-extrabold' : 'text-slate-400 hover:text-white'
            }`}
          >
            الدورات
          </button>
          <button
            type="button"
            onClick={() => handleTypeSelect('scholarship')}
            className={`relative z-10 flex-1 py-1.5 text-center rounded-full text-xs font-['Tajawal'] font-bold transition-colors duration-300 cursor-pointer ${
              currentType === 'scholarship' ? 'text-[#040F24] font-extrabold' : 'text-slate-400 hover:text-white'
            }`}
          >
            المنح
          </button>
        </div>

        {/* Clean Mobile Search Form (no internal buttons) */}
        <form
          onSubmit={handleSubmit}
          className="search-form-mobile"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ماذا تبحث عنه؟"
            className="flex-1 px-4 text-sm sm:text-base font-['Tajawal'] text-[#DCE5EE] placeholder-[#8299B5]/80 bg-transparent border-none outline-none text-right"
          />

          <button
            type="submit"
            aria-label="بحث"
            className="group btn-search-submit w-10 h-10 shrink-0"
          >
            {CompassIcon}
          </button>
        </form>
      </div>
    );
  }

  // Desktop Variant: Unified Single Bar with 3 Inline Options (الكل / دورة / منحة)
  return (
    <form
      onSubmit={handleSubmit}
      className={`search-form-desktop ${className}`}
    >
      {/* Right (Start in RTL): 3-Segment Toggle with Physical Sliding Highlight */}
      <div className="search-pills-container w-[270px] h-12 relative p-1 bg-[#040F24] rounded-full border border-[#1B3F80]/60 flex items-center select-none shrink-0">
        {/* Physical Sliding Highlight Puck */}
        <div
          className={`absolute top-1 bottom-1 rounded-full pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            currentType === 'all'
              ? 'bg-gradient-to-r from-[#E5B65C]/25 to-[#29A9FF]/25 border border-[#E5B65C]/50 shadow-[0_0_12px_rgba(229,182,92,0.35)]'
              : currentType === 'course'
              ? 'bg-[#29A9FF]/20 border border-[#29A9FF]/50 shadow-[0_0_14px_rgba(41,169,255,0.4)]'
              : 'bg-[#E5B65C]/20 border border-[#E5B65C]/50 shadow-[0_0_14px_rgba(229,182,92,0.4)]'
          }`}
          style={getDesktopPuckStyle(currentType)}
        />

        <button
          type="button"
          onClick={() => handleTypeSelect('all')}
          className={`relative z-10 flex-1 py-2 text-center rounded-full text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold transition-colors duration-300 cursor-pointer ${
            currentType === 'all'
              ? 'text-[#E5B65C] font-bold drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]'
              : 'text-[#8299B5] hover:text-[#DCE5EE]'
          }`}
        >
          {toArabic('search', 'all')}
        </button>
        <button
          type="button"
          onClick={() => handleTypeSelect('course')}
          className={`relative z-10 flex-1 py-2 text-center rounded-full text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold transition-colors duration-300 cursor-pointer ${
            currentType === 'course'
              ? 'text-[#29A9FF] font-bold drop-shadow-[0_0_8px_rgba(41,169,255,0.4)]'
              : 'text-[#8299B5] hover:text-[#DCE5EE]'
          }`}
        >
          {toArabic('search', 'course')}
        </button>
        <button
          type="button"
          onClick={() => handleTypeSelect('scholarship')}
          className={`relative z-10 flex-1 py-2 text-center rounded-full text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold transition-colors duration-300 cursor-pointer ${
            currentType === 'scholarship'
              ? 'text-[#E5B65C] font-bold drop-shadow-[0_0_8px_rgba(229,182,92,0.4)]'
              : 'text-[#8299B5] hover:text-[#DCE5EE]'
          }`}
        >
          {toArabic('search', 'scholarship')}
        </button>
      </div>

      {/* Center: Search Input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ماذا تبحث عنه؟"
        className="flex-1 px-6 text-lg font-['Tajawal'] text-[#DCE5EE] placeholder-[#8299B5]/80 bg-transparent border-none outline-none text-right"
      />

      {/* Left (End in RTL): Blue Circular Submit Button */}
      <button
        type="submit"
        aria-label="تنفيذ البحث"
        className="group btn-search-submit w-12 h-12"
      >
        {CompassIcon}
      </button>
    </form>
  );
};
