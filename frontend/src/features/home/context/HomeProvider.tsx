import React from 'react';
import { useNavigate } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { fetchHome, HOME_MOCK_PAYLOAD, type HomePayload } from '@/features/home/data/homeFetcher';
import { HomeContext } from '@/features/home/context/homeContext';
import type { CatalogSearchType, HomeContextValue } from '@/features/home/context/homeContext';

/** The search type (course|scholarship|all) maps to the catalog's type query. */
const TAB_BY_SEARCH_TYPE: Record<CatalogSearchType, string> = {
  course: 'courses',
  scholarship: 'scholarships',
  all: 'all',
};

/** Owns every piece of home state so all sections read one source. */
export const HomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // One cached payload for all home rails (mock or live).
  const { data } = useCachedData<HomePayload>(['home-content'], fetchHome, {
    initialData: HOME_MOCK_PAYLOAD,
    staleTime: 10 * 60 * 1000,
  });
  const home = data ?? HOME_MOCK_PAYLOAD;

  const submitSearch = (query: string, type: CatalogSearchType) => {
    navigate(`/catalog?type=${TAB_BY_SEARCH_TYPE[type]}&q=${encodeURIComponent(query)}`);
  };

  const value: HomeContextValue = {
    coursesData: home.courses,
    scholarshipsData: home.scholarships,
    quickLinks: home.quickLinks,
    competitionMobile: home.competitionMobile,
    competitionDesktop: home.competitionDesktop,
    eventMobile: home.eventMobile,
    eventDesktopFeatured: home.eventDesktopFeatured,
    eventDesktopWorkshop: home.eventDesktopWorkshop,
    navigateTo: navigate,
    submitSearch,
  };

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
};
