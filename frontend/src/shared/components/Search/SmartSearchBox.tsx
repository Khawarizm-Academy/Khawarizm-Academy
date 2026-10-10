import React, { useState } from 'react';
import { Compass } from 'lucide-react';
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

type SearchType = 'course' | 'scholarship' | 'all';

/** Sliding puck and type-button classes per variant + type. */
const PUCK_TONE: Record<'mobile' | 'desktop', Record<SearchType, string>> = {
  mobile: {
    all: 'search-puck search-puck-mobile-all',
    course: 'search-puck search-puck-mobile-course',
    scholarship: 'search-puck search-puck-mobile-scholarship',
  },
  desktop: {
    all: 'search-puck search-puck-desktop-all',
    course: 'search-puck search-puck-desktop-course',
    scholarship: 'search-puck search-puck-desktop-scholarship',
  },
};

/** Type-button classes: active and idle for each variant + type. */
const TYPE_TONE: Record<'mobile' | 'desktop', Record<SearchType, { active: string; idle: string }>> = {
  mobile: {
    all: { active: 'search-type-mobile search-type-mobile-on-dark', idle: 'search-type-mobile search-type-idle' },
    course: { active: 'search-type-mobile search-type-mobile-on-light', idle: 'search-type-mobile search-type-idle' },
    scholarship: { active: 'search-type-mobile search-type-mobile-on-dark', idle: 'search-type-mobile search-type-idle' },
  },
  desktop: {
    all: { active: 'search-type-desktop search-type-desktop-on-gold', idle: 'search-type-desktop search-type-desktop-idle' },
    course: { active: 'search-type-desktop search-type-desktop-on-blue', idle: 'search-type-desktop search-type-desktop-idle' },
    scholarship: { active: 'search-type-desktop search-type-desktop-on-gold', idle: 'search-type-desktop search-type-desktop-idle' },
  },
};

/** Puck offsets, RTL first-to-last: all (right) → course (center) → scholarship (left). */
const PUCK_OFFSET: Record<SearchType, { right: string; width: string }> = {
  all: { right: '4px', width: 'calc(33.333% - 2.67px)' },
  course: { right: 'calc(33.333% + 1.33px)', width: 'calc(33.333% - 2.67px)' },
  scholarship: { right: 'calc(66.666% - 1.33px)', width: 'calc(33.333% - 2.67px)' },
};

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
  const [internalSelectedType, setInternalSelectedType] = useState<SearchType>(initialType || 'all');

  const [prevInitialType, setPrevInitialType] = useState(initialType);
  if (!isControlled && initialType !== prevInitialType) {
    setPrevInitialType(initialType);
    setInternalSelectedType(initialType || 'all');
  }

  const currentType = isControlled ? controlledType : internalSelectedType;

  const handleTypeSelect = (type: SearchType) => {
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

  // Compass / Astrolabe glyph (stylized brand differentiator, per design docs §5.3)
  const CompassIcon = (
    <Compass size={20} className="w-5 h-5 transition-transform duration-500 group-hover:rotate-45" />
  );

  // Mobile Variant: 3-Way Switcher on TOP + Clean Spacious Search Input Below
  if (variant === 'mobile') {
    return (
      <div className={`search-swell ${className}`}>
        {/* Top 3-Way Switcher: Same style, shape, and look matching the celestial design system */}
        <div className="search-switcher-mobile">
          {/* Physical Sliding Highlight Puck */}
          <div
            className={PUCK_TONE.mobile[currentType]}
            style={PUCK_OFFSET[currentType]}
          />

          {(Object.keys(TYPE_TONE.mobile) as SearchType[]).map((type) => {
            const tone = TYPE_TONE.mobile[type];
            const isActive = currentType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeSelect(type)}
                className={isActive ? tone.active : tone.idle}
              >
                {toArabic('search', type)}
              </button>
            );
          })}
        </div>

        {/* Clean Mobile Search Form (no internal buttons) */}
        <form onSubmit={handleSubmit} className="search-form-mobile">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ماذا تبحث عنه؟"
            className="search-input-mobile"
          />

          <button type="submit" aria-label="بحث" className="group btn-search-submit w-10 h-10 shrink-0">
            {CompassIcon}
          </button>
        </form>
      </div>
    );
  }

  // Desktop Variant: Unified Single Bar with 3 Inline Options (الكل / دورة / منحة)
  return (
    <form onSubmit={handleSubmit} className={`search-form-desktop ${className}`}>
      {/* Right (Start in RTL): 3-Segment Toggle with Physical Sliding Highlight */}
      <div className="search-pills-container search-pills-desktop">
        {/* Physical Sliding Highlight Puck */}
        <div
          className={PUCK_TONE.desktop[currentType]}
          style={PUCK_OFFSET[currentType]}
        />

        {(Object.keys(TYPE_TONE.desktop) as SearchType[]).map((type) => {
          const tone = TYPE_TONE.desktop[type];
          const isActive = currentType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeSelect(type)}
              className={isActive ? tone.active : tone.idle}
            >
              {toArabic('search', type)}
            </button>
          );
        })}
      </div>

      {/* Center: Search Input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ماذا تبحث عنه؟"
        className="search-input-desktop"
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