import React, { useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { dataCacheManager } from '@/shared/lib/cacheManager';
import { CatalogCard } from '@/features/catalog/components/cards/CatalogCard';
import { fetchCourseDetail, fetchRelatedCourses } from '@/features/courses/data/courseFetchers';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';
import type { CatalogItem } from '@/shared/types/entities';

interface RelatedCoursesRailProps {
  relatedIds: string[];
}

/** Same-card rail for sibling courses, sharing the catalog's card grammar. */
export const RelatedCoursesRail: React.FC<RelatedCoursesRailProps> = ({ relatedIds }) => {
  const navigate = useNavigate();
  // No ids means nothing to fetch or show.
  const hasRelated = relatedIds.length > 0;

  const fetcher = useCallback(() => fetchRelatedCourses(relatedIds), [relatedIds]);
  const { data: items, isLoading } = useCachedData<CatalogItem[]>(['course-related', relatedIds], fetcher, {
    keepPreviousData: true,
    staleTime: 10 * 60 * 1000,
    enabled: hasRelated,
  });

  // Keep the layout stable while the rail loads.
  if (isLoading) return null;

  const selectCourse = (item: CatalogItem) => navigate(`/courses/${item.id}`);
  const prefetchCourse = (id: string) => dataCacheManager.prefetch(['course-detail', id], () => fetchCourseDetail(id));
  const list = items ?? [];

  return (
    <section className="course-section">
      <h2 className="course-section-title">{courseCopy.landing.relatedTitle}</h2>
      {list.length === 0 ? (
        <CourseSectionEmpty copy={courseEmptyStates.related} icon={<Sparkles size={18} />} />
      ) : (
        <div className="horizontal-scroll-row">
          {list.map((item, idx) => (
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
      )}
    </section>
  );
};