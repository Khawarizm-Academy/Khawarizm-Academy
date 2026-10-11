import React, { useCallback } from 'react';
import { useNavigate } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { dataCacheManager } from '@/shared/lib/cacheManager';
import { CatalogCard } from '@/features/catalog/components/cards/CatalogCard';
import { fetchCourseDetail, fetchRelatedCourses } from '@/features/courses/data/courseFetchers';
import { courseCopy } from '@/features/courses/data/courseCopy';
import type { CatalogItem } from '@/shared/mocks/catalog';

interface RelatedCoursesRailProps {
  relatedIds: string[];
}

/** Same-card rail for sibling courses, sharing the catalog's card grammar. */
export const RelatedCoursesRail: React.FC<RelatedCoursesRailProps> = ({ relatedIds }) => {
  const navigate = useNavigate();

  const fetcher = useCallback(() => fetchRelatedCourses(relatedIds), [relatedIds]);
  const { data: items, isLoading } = useCachedData<CatalogItem[]>(['course-related', relatedIds], fetcher, {
    keepPreviousData: true,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading || !items || items.length === 0) return null;

  const selectCourse = (item: CatalogItem) => navigate(`/courses/${item.id}`);
  const prefetchCourse = (id: string) => dataCacheManager.prefetch(['course-detail', id], () => fetchCourseDetail(id));

  return (
    <section className="course-section">
      <h2 className="course-section-title">{courseCopy.landing.relatedTitle}</h2>
      <div className="horizontal-scroll-row">
        {items.map((item, idx) => (
          <div key={item.id} className="course-related-card animate-pop-in" style={{ animationDelay: `${idx * 80}ms` }}>
            <CatalogCard
              item={item}
              index={idx}
              onSelect={selectCourse}
              onPrefetch={() => prefetchCourse(item.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
};