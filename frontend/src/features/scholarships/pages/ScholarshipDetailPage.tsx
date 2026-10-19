import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { dataCacheManager } from '@/shared/lib/cacheManager';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import { useAuth } from '@/features/auth/context/authContext';
import { PageSkeleton } from '@/shared/components/Loading/PageSkeleton';
import { ItemDetailView } from '@/shared/components/Detail/ItemDetailView';
import {
  applyToScholarship,
  fetchScholarshipDetail,
  saveScholarship,
} from '@/features/scholarships/data/scholarshipFetchers';
import { fetchSavedScholarships } from '@/features/dashboard/data/dashboardFetchers';
import { ScholarshipNotFound } from '@/features/scholarships/components/states/ScholarshipNotFound';
import scholarshipCopy from '@/shared/json/scholarshipDetail.json';
import type { CatalogItem } from '@/shared/types/entities';
import type { SavedScholarshipItem } from '@/features/dashboard/types';

export const ScholarshipDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  // The API is the source of truth; a local override covers the optimistic click.
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
  const [isApplied, setIsApplied] = useState(false);

  const fetcher = useCallback(() => fetchScholarshipDetail(slug), [slug]);

  const { data: item, isLoading } = useCachedData<CatalogItem | null>(['catalog-detail', slug], fetcher, {
    keepPreviousData: true,
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });

  // Saved scholarships are gated: only a signed-in reader has these rows.
  const savedFetcher = useCallback(() => fetchSavedScholarships(), []);
  const { data: savedScholarships } = useCachedData<SavedScholarshipItem[]>(
    ['dashboard', 'saved-scholarships'],
    savedFetcher,
    { enabled: Boolean(user), initialData: [] }
  );

  const isSaved = savedOverride ?? savedScholarships.some((row) => row.id === slug);

  const apply = () => {
    // Guests are sent to sign in, since an application belongs to an account.
    if (!user) {
      navigate(NAV_TARGETS.login);
      return;
    }
    if (isApplied) return;
    setIsApplied(true);
    void applyToScholarship(slug).catch(() => setIsApplied(false));
  };

  const toggleSave = () => {
    if (!user) {
      navigate(NAV_TARGETS.login);
      return;
    }
    const next = !isSaved;
    setSavedOverride(next);
    void saveScholarship(slug)
      .then((saved) => {
        setSavedOverride(saved);
        dataCacheManager.invalidate(['dashboard', 'saved-scholarships']);
      })
      .catch(() => setSavedOverride(null));
  };

  if (isLoading) {
    return <PageSkeleton variant="detail" />;
  }

  if (!item) {
    return (
      <main className="content-container">
        <ScholarshipNotFound />
      </main>
    );
  }

  return (
    <ItemDetailView
      item={item}
      backPath="/catalog?type=scholarships"
      primaryLabel={isApplied ? scholarshipCopy.appliedLabel : scholarshipCopy.applyLabel}
      onPrimaryAction={apply}
      isSaved={isSaved}
      onToggleSave={toggleSave}
      saveLabel={scholarshipCopy.saveLabel}
      savedLabel={scholarshipCopy.savedLabel}
    />
  );
};
