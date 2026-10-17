import React from 'react';
import { CircleAlert, Trophy } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { StatePanel } from '@/shared/components/State/StatePanel';
import { CompetitionBanner } from '@/shared/components/Banners/CompetitionBanner';
import { fetchCompetitions } from '@/features/competitions/data/competitionFetchers';
import { CompetitionCard } from '@/features/competitions/components/cards/CompetitionCard';
import type { Competition } from '@/shared/types/entities';

/** Competitions are played in the dashboard, so every CTA routes there. */
const ACHIEVEMENTS_ROUTE = `${NAV_TARGETS.dashboard}?view=achievements`;

/** The most urgent challenge first: fewest days left, then fewest hours. */
function rankByUrgency(a: Competition, b: Competition): number {
  const days = Number(a.daysRemaining) - Number(b.daysRemaining);
  return days !== 0 ? days : Number(a.hoursRemaining) - Number(b.hoursRemaining);
}

/** The only part that re-renders on data change; the hero stays stable. */
export const CompetitionsDataSection: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useCachedData<Competition[]>(
    ['competitions-list'],
    fetchCompetitions,
    { staleTime: 5 * 60 * 1000, cacheTime: 30 * 60 * 1000, initialData: [] }
  );

  if (isError) {
    return (
      <StatePanel
        tone="danger"
        icon={<CircleAlert size={30} />}
        title="تعذّر تحميل المسابقات"
        text="حدث خطأ أثناء جلب التحديات. حاول مرة أخرى بعد لحظات."
        action={
          <button type="button" onClick={() => refetch()} className="btn-outline-blue text-xs mt-2">
            إعادة المحاولة
          </button>
        }
      />
    );
  }

  if (isLoading) {
    return <DataSectionSkeleton variant="grid" count={6} />;
  }

  if (data.length === 0) {
    return (
      <StatePanel
        icon={<Trophy size={30} />}
        title="لا توجد مسابقات نشطة حالياً"
        text="نحضّر تحديات وتحديثات جديدة. عُد قريباً لتشارك في المنافسة."
      />
    );
  }

  const [primary, ...rest] = [...data].sort(rankByUrgency);
  const goToArena = () => navigate(ACHIEVEMENTS_ROUTE);

  return (
    <div className="competitions-data">
      <section className="competitions-section">
        <h2 className="competitions-section-title section-accent-title-gold">
          <span>التحدي الأقرب</span>
        </h2>

        {/* The banner owns its per-surface markup; only CSS picks which one shows. */}
        <div className="hidden md:block">
          <CompetitionBanner variant="desktop" competition={primary} onRegister={goToArena} />
        </div>
        <div className="block md:hidden">
          <CompetitionBanner variant="mobile" competition={primary} onRegister={goToArena} />
        </div>
      </section>

      {rest.length > 0 && (
        <section className="competitions-section">
          <h2 className="competitions-section-title section-accent-title-gold">
            <span>مسابقات أخرى</span>
          </h2>
          <div className="competitions-grid">
            {rest.map((competition) => (
              <CompetitionCard
                key={competition.id}
                competition={competition}
                onAction={goToArena}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
