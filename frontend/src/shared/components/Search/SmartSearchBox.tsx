import React, { useState } from 'react';
import { toArabic } from '../../lib/localization';

interface SmartSearchBoxProps {
  variant?: 'desktop' | 'mobile';
  onSearch?: (query: string, type: 'course' | 'scholarship' | 'all') => void;
}

export const SmartSearchBox: React.FC<SmartSearchBoxProps> = ({
  variant = 'desktop',
  onSearch,
}) => {
  const [selectedType, setSelectedType] = useState<'course' | 'scholarship'>('course');
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query, selectedType);
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

  // Mobile Variant matching media_1788955065979.png with gliding highlight pill
  if (variant === 'mobile') {
    return (
      <form
        onSubmit={handleSubmit}
        className="search-form-mobile"
      >
        {/* Filter Pills Container with Sliding Magnetic Puck (Left in RTL) */}
        <div className="search-pills-container w-32">
          {/* Physical Sliding Highlight Pill */}
          <div
            className={`absolute top-1 bottom-1 rounded-full pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              selectedType === 'course'
                ? 'right-1 w-[calc(50%-4px)] bg-[#29A9FF]/20 border border-[#29A9FF]/50 shadow-[0_0_10px_rgba(41,169,255,0.4)]'
                : 'right-[50%] w-[calc(50%-4px)] bg-[#E5B65C]/20 border border-[#E5B65C]/50 shadow-[0_0_10px_rgba(229,182,92,0.4)]'
            }`}
          />

          <button
            type="button"
            onClick={() => setSelectedType('course')}
            className={`relative z-10 flex-1 py-1 text-center rounded-full text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold transition-colors duration-300 cursor-pointer ${
              selectedType === 'course' ? 'text-[#29A9FF]' : 'text-[#8299B5] hover:text-[#DCE5EE]'
            }`}
          >
            {toArabic('search', 'course')}
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('scholarship')}
            className={`relative z-10 flex-1 py-1 text-center rounded-full text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold transition-colors duration-300 cursor-pointer ${
              selectedType === 'scholarship' ? 'text-[#E5B65C]' : 'text-[#8299B5] hover:text-[#DCE5EE]'
            }`}
          >
            {toArabic('search', 'scholarship')}
          </button>
        </div>

        {/* Text Input (Center) */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ماذا تبحث عنه؟"
          className="flex-1 px-3 text-sm sm:text-base font-['Tajawal'] text-[#DCE5EE] placeholder-[#8299B5]/80 bg-transparent border-none outline-none text-right"
        />

        {/* Blue Circular Search Icon (Right / Start in RTL) */}
        <button
          type="submit"
          aria-label="بحث"
          className="group btn-search-submit w-10 h-10"
        >
          {CompassIcon}
        </button>
      </form>
    );
  }

  // Desktop Variant matching media_1788955066031.png with gliding highlight pill
  return (
    <form
      onSubmit={handleSubmit}
      className="search-form-desktop"
    >
      {/* Right (Start in RTL): Segment Toggle with Physical Sliding Highlight */}
      <div className="search-pills-container w-52 h-12">
        {/* Physical Sliding Highlight Pill */}
        <div
          className={`absolute top-1 bottom-1 rounded-full pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            selectedType === 'course'
              ? 'right-1 w-[calc(50%-4px)] bg-[#29A9FF]/20 border border-[#29A9FF]/50 shadow-[0_0_14px_rgba(41,169,255,0.4)]'
              : 'right-[50%] w-[calc(50%-4px)] bg-[#E5B65C]/20 border border-[#E5B65C]/50 shadow-[0_0_14px_rgba(229,182,92,0.4)]'
          }`}
        />

        <button
          type="button"
          onClick={() => setSelectedType('course')}
          className={`relative z-10 flex-1 py-2 text-center rounded-full text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold transition-colors duration-300 cursor-pointer ${
            selectedType === 'course' ? 'text-[#29A9FF] font-bold' : 'text-[#8299B5] hover:text-[#DCE5EE]'
          }`}
        >
          {toArabic('search', 'course')}
        </button>
        <button
          type="button"
          onClick={() => setSelectedType('scholarship')}
          className={`relative z-10 flex-1 py-2 text-center rounded-full text-xs font-['IBM_Plex_Sans_Arabic'] font-semibold transition-colors duration-300 cursor-pointer ${
            selectedType === 'scholarship' ? 'text-[#E5B65C] font-bold' : 'text-[#8299B5] hover:text-[#DCE5EE]'
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
