import React from 'react';
import { useCatalog } from '@/features/catalog/context/catalogContext';
import type { Surface, Tone } from '@/features/catalog/data/catalogFilters';
import type { CatalogFiltersState } from '@/features/catalog/types';

/** Active pill per tone and surface; the mobile surface drops a stronger background, glow groups add their ring. */
const PILL_ACTIVE = {
  gold: {
    desktop: 'catalog-pill-gold',
    desktopGlow: 'catalog-pill-gold catalog-pill-glow-gold',
    mobile: 'catalog-pill-gold bg-gold-400/20',
  },
  sky: {
    desktop: 'catalog-pill-sky',
    desktopGlow: 'catalog-pill-sky catalog-pill-glow-sky',
    mobile: 'catalog-pill-sky bg-blue-400/20',
  },
} satisfies Record<Tone, Record<string, string>>;

/** Only the desktop surface gets hover feedback — touch has no hover. */
const PILL_IDLE = {
  desktop: 'catalog-pill-idle hover:text-white hover:border-blue-400/50',
  mobile: 'catalog-pill-idle',
} satisfies Record<Surface, string>;

/** One labelled row of filter pills. The sidebar and the drawer both use it. */
export const CatalogFilterGroups: React.FC<{
  filters: CatalogFiltersState;
  surface: Surface;
  onChangeFilter: (key: keyof CatalogFiltersState, value: string) => void;
}> = ({ filters, surface, onChangeFilter }) => {
  const { filterGroups, isFiltersLoading } = useCatalog();
  const groups = filterGroups[surface];

  if (isFiltersLoading) {
    return <p className="catalog-group-label animate-pulse">جارٍ تحميل عوامل التصفية…</p>;
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2.5">
          <label className="catalog-group-label">{group.label}</label>
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
                  className={`catalog-pill ${isActive ? activeClass : PILL_IDLE[surface]}`}
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
