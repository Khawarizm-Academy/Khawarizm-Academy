import React, { useCallback } from 'react';
import { useParams } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { PageSkeleton } from '@/shared/components/Loading/PageSkeleton';
import { ItemDetailView } from '@/shared/components/Detail/ItemDetailView';
import { StatePanel } from '@/shared/components/State/StatePanel';
import { fetchScholarshipDetail } from '@/features/scholarships/data/scholarshipFetchers';
import type { CatalogItem } from '@/shared/types/entities';

export const ScholarshipDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const fetcher = useCallback(() => fetchScholarshipDetail(slug), [slug]);

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
        <StatePanel
          title="المنحة غير متوفرة"
          text="لم يتم العثور على هذه المنحة. قد يكون التقديم قد أغلق أو لم تُنشر بعد."
        />
      </main>
    );
  }

  return (
    <ItemDetailView item={item} backPath="/catalog?type=scholarships" primaryLabel="تقدم الآن لهذه المنحة" />
  );
};