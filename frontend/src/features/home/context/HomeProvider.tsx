import React from 'react';
import { useNavigate } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { mockCourses, mockScholarships } from '@/shared/mocks/homepage';
import { HomeContext } from '@/features/home/context/homeContext';
import type { CatalogSearchType, HomeContextValue } from '@/features/home/context/homeContext';
import type { Course, Scholarship } from '@/shared/types/entities';

/** The search type (course|scholarship|all) maps to the catalog's type query. */
const TAB_BY_SEARCH_TYPE: Record<CatalogSearchType, string> = {
  course: 'courses',
  scholarship: 'scholarships',
  all: 'all',
};

/** Owns every piece of home state so all sections read one source. */
export const HomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // Cached data fetchers for the twin rails
  const { data: coursesData } = useCachedData<Course[]>(
    ['home-featured-courses'],
    async () => mockCourses,
    { initialData: mockCourses, staleTime: 10 * 60 * 1000 }
  );

  const { data: scholarshipsData } = useCachedData<Scholarship[]>(
    ['home-featured-scholarships'],
    async () => mockScholarships,
    { initialData: mockScholarships, staleTime: 10 * 60 * 1000 }
  );

  const submitSearch = (query: string, type: CatalogSearchType) => {
    navigate(`/catalog?type=${TAB_BY_SEARCH_TYPE[type]}&q=${encodeURIComponent(query)}`);
  };

  const value: HomeContextValue = {
    coursesData: coursesData || mockCourses,
    scholarshipsData: scholarshipsData || mockScholarships,
    navigateTo: navigate,
    submitSearch,
  };

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
};