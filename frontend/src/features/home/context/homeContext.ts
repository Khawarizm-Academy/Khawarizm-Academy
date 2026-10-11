import { createContext, useContext } from 'react';
import type { Course, Scholarship } from '@/shared/types/entities';

export type CatalogSearchType = 'course' | 'scholarship' | 'all';

export interface HomeContextValue {
  coursesData: Course[];
  scholarshipsData: Scholarship[];
  navigateTo: (path: string) => void;
  submitSearch: (query: string, type: CatalogSearchType) => void;
}

export const HomeContext = createContext<HomeContextValue | null>(null);

/** Every piece of home state the sections share, without prop drilling. */
export function useHome(): HomeContextValue {
  const value = useContext(HomeContext);
  if (!value) throw new Error('[home] useHome must be used inside HomeProvider.');
  return value;
}