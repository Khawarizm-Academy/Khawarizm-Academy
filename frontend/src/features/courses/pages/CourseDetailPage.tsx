import React, { useCallback } from 'react';
import { useParams } from '../../../app/routerContext';
import { useCachedData } from '../../../shared/hooks/useCachedData';
import { PageSkeleton } from '../../../shared/components/Loading/PageSkeleton';
import { ItemDetailView } from '../../../shared/components/Detail/ItemDetailView';
import { mockCatalogAll, type CatalogItem } from '../../../mocks/catalog';

export const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const fetcher = useCallback(async (): Promise<CatalogItem | null> => {
    await new Promise((res) => setTimeout(res, 60));
    return mockCatalogAll.find((i) => i.id === slug && i.type === 'course') ?? null;
  }, [slug]);

  // Same cache key the catalog grid prefetches on hover -> instant cold detail.
  const { data: item, isLoading } = useCachedData<CatalogItem | null>(['catalog-detail', slug], fetcher, {
    keepPreviousData: true,
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return <PageSkeleton variant="detail" />;
  }

  if (!item) {
    return (
      <main className="content-container">
        <div className="w-full py-20 px-6 glass-panel rounded-2xl flex-col-center text-center gap-4 border border-[#1B3F80]">
          <h3 className="text-xl font-bold text-white font-['IBM_Plex_Sans_Arabic']">الدورة غير متوفرة</h3>
          <p className="text-slate-400 text-sm font-['Tajawal'] max-w-md">لم يتم العثور على هذه الدورة. قد تكون منتهية أو لم تُنشر بعد.</p>
        </div>
      </main>
    );
  }

  return (
    <ItemDetailView item={item} backPath="/catalog?type=courses" primaryLabel="التحق بالدورة الآن" />
  );
};