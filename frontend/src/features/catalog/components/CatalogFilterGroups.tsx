import React from 'react';
import { getFilterGroups, type Surface, type Tone } from '../data/catalogFilters';
import type { CatalogFiltersState, CatalogTab } from '../types';

/** Pill classes per tone and surface; the glow variant is used by groups that ask for it. */
const PILL_ACTIVE = {
  gold: {
    desktop: 'bg-[#E5B65C]/15 border border-[#E5B65C] text-[#E5B65C]',
    desktopGlow:
      'bg-[#E5B65C]/15 border border-[#E5B65C] text-[#E5B65C] shadow-[0_0_10px_rgba(229,182,92,0.25)]',
    mobile: 'bg-[#E5B65C]/20 border border-[#E5B65C] text-[#E5B65C]',
  },
  sky: {
    desktop: 'bg-[#29A9FF]/15 border border-[#29A9FF] text-[#29A9FF]',
    desktopGlow:
      'bg-[#29A9FF]/15 border border-[#29A9FF] text-[#29A9FF] shadow-[0_0_10px_rgba(41,169,255,0.25)]',
    mobile: 'bg-[#29A9FF]/20 border border-[#29A9FF] text-[#29A9FF]',
  },
} satisfies Record<Tone, Record<string, string>>;

const PILL_IDLE = {
  desktop:
    'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5] hover:text-white hover:border-[#29A9FF]/50',
  mobile: 'bg-[#040F24]/80 border border-[#1B3F80]/70 text-[#8299B5]',
} satisfies Record<Surface, string>;

const PILL_BASE =
  "py-1.5 px-3 rounded-lg text-xs font-['Tajawal'] font-medium transition-all duration-200 cursor-pointer";

/** One labelled row of filter pills. The sidebar and the drawer both use it. */
export const CatalogFilterGroups: React.FC<{
  tab: CatalogTab;
  filters: CatalogFiltersState;
  surface: Surface;
  onChangeFilter: (key: keyof CatalogFiltersState, value: string) => void;
}> = ({ tab, filters, surface, onChangeFilter }) => {
  const groups = getFilterGroups(surface, tab);

  return (
    <>
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2.5">
          <label className="text-white text-sm font-bold font-['IBM_Plex_Sans_Arabic'] text-right">
            {group.label}
          </label>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const isActive = filters[group.key] === option.id;
              const activeClass =
                surface === 'desktop'
                  ? PILL_ACTIVE[group.tone][group.glow ? 'desktopGlow' : 'desktop']
                  : PILL_ACTIVE[group.tone].mobile;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChangeFilter(group.key, option.id)}
                  className={`${PILL_BASE} ${isActive ? activeClass : PILL_IDLE[surface]}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
};
