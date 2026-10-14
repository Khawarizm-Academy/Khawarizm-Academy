import React from 'react';
import { useNavigate } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { PageSkeleton } from '@/shared/components/Loading/PageSkeleton';
import { fetchHome, type HomePayload } from '@/features/home/data/homeFetcher';
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

  // One cached payload for all home rails.
  const { data: home, isLoading } = useCachedData<HomePayload>(['home-content'], fetchHome, {
    staleTime: 10 * 60 * 1000,
  });

  const submitSearch = (query: string, type: CatalogSearchType) => {
    navigate(`/catalog?type=${TAB_BY_SEARCH_TYPE[type]}&q=${encodeURIComponent(query)}`);
  };

  // The home rails are one payload; show the page skeleton until it arrives.
  if (isLoading || !home) {
    return <PageSkeleton variant="home" />;
  }

  // Normalize the transport payload: rails are always arrays, singulars stay nullable.
  const value: HomeContextValue = {
    coursesData: home.courses ?? [],
    scholarshipsData: home.scholarships ?? [],
    quickLinks: home.quickLinks ?? [],
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
