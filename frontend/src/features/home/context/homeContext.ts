import { createContext, useContext } from 'react';
import type { Competition, Course, EventItem, Scholarship } from '@/shared/types/entities';
import type { QuickLink } from '@/shared/mocks/homepage';

export type CatalogSearchType = 'course' | 'scholarship' | 'all';

export interface HomeContextValue {
  coursesData: Course[];
  scholarshipsData: Scholarship[];
  quickLinks: QuickLink[];
  competitionMobile: Competition;
  competitionDesktop: Competition;
  eventMobile: EventItem;
  eventDesktopFeatured: EventItem;
  eventDesktopWorkshop: EventItem;
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
