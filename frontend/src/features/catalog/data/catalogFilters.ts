import type { CatalogFiltersState } from '@/features/catalog/types';

/** Which accent a filter group paints itself in. */
export type Tone = 'gold' | 'sky';

/** Desktop sidebar or mobile bottom sheet. */
export type Surface = 'desktop' | 'mobile';

/** One selectable pill the API returns for a group. */
export interface FilterOption {
  id: string;
  label: string;
}

/** A filter group resolved by the API for one surface + tab. */
export interface ResolvedFilterGroup {
  key: keyof CatalogFiltersState;
  label: string;
  tone: Tone;
  glow: boolean;
  options: FilterOption[];
}
