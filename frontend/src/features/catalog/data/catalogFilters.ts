import catalogJson from '@/shared/json/catalog.json';
import type { CatalogFiltersState, CatalogTab } from '@/features/catalog/types';

/** Which accent a filter group paints itself in. */
export type Tone = 'gold' | 'sky';

/** Desktop sidebar or mobile bottom sheet. */
export type Surface = 'desktop' | 'mobile';

export interface FilterOption {
  id: string;
  label: string;
}

/** What a tab can change about a group: its label, its accent, or its options. */
interface FilterVariant {
  label?: string;
  tone?: Tone;
  mobileTone?: Tone;
  options?: FilterOption[];
  extraOptions?: FilterOption[];
}

interface FilterGroupConfig {
  key: keyof CatalogFiltersState;
  label: string;
  tone: Tone;
  /** Mobile keeps its own accent when it differs from desktop. */
  mobileTone?: Tone;
  glow?: boolean;
  surfaces: Surface[];
  options?: FilterOption[];
  variants?: Partial<Record<CatalogTab, FilterVariant>>;
}

export interface ResolvedFilterGroup {
  key: keyof CatalogFiltersState;
  label: string;
  tone: Tone;
  glow: boolean;
  options: FilterOption[];
}

const CONFIG = catalogJson.filters.groups as FilterGroupConfig[];

/** Filter groups a surface shows for a tab, each with its tab-specific label and options. */
export function getFilterGroups(surface: Surface, tab: CatalogTab): ResolvedFilterGroup[] {
  return CONFIG.filter((group) => group.surfaces.includes(surface)).map((group) => {
    const variant = group.variants?.[tab] ?? {};
    const tone =
      (surface === 'mobile' ? variant.mobileTone ?? group.mobileTone : variant.tone) ?? group.tone;

    return {
      key: group.key,
      label: variant.label ?? group.label,
      tone,
      glow: group.glow ?? false,
      options: [...(variant.options ?? group.options ?? []), ...(variant.extraOptions ?? [])],
    };
  });
}
