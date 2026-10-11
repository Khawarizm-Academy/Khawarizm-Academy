import React, { useState } from 'react';
import { Trophy, Award, Download } from 'lucide-react';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { SlidingSegmentedControl } from '@/shared/components/Controls/SlidingSegmentedControl';
import { fetchCompetitions, fetchCertificates } from '@/features/dashboard/data/dashboardFetchers';
import type { CompetitionItem, CertificateItem } from '@/features/dashboard/types';
import dashboardViewsJson from '@/shared/json/dashboardViews.json';
export type { CompetitionItem, CertificateItem };

interface CompetitionsCertificatesViewProps {
  onOpenArena?: (comp: CompetitionItem) => void;
  onPreviewCertificate?: (cert: CertificateItem) => void;
}

type CompFilter = 'completed' | 'active';

const COMP_FILTERS = dashboardViewsJson.competitionFilters as { id: CompFilter; label: string }[];

/** Status dot tone by competition status color from the dashboard mock. */
const STATUS_DOT: Record<CompetitionItem['statusColor'], string> = {
  red: 'bg-red-500 animate-ping',
  green: 'bg-emerald-400',
  blue: 'bg-blue-400',
};

export const CompetitionsCertificatesView: React.FC<CompetitionsCertificatesViewProps> = ({
  onOpenArena,
  onPreviewCertificate,
}) => {
  const [filterMode, setFilterMode] = useState<CompFilter>('completed');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: competitions, isLoading: isLoadingCompetitions } = useCachedData<CompetitionItem[]>(
    ['dashboard', 'competitions'],
    fetchCompetitions,
    { initialData: [] }
  );

  const { data: certificates, isLoading: isLoadingCertificates } = useCachedData<CertificateItem[]>(
    ['dashboard', 'certificates'],
    fetchCertificates,
    { initialData: [] }
  );

  const handleDownload = (cert: CertificateItem) => {
    setDownloadingId(cert.id);
    setTimeout(() => {
      setDownloadingId(null);
      onPreviewCertificate?.(cert);
    }, 1000);
  };

  return (
    <div dir="rtl" className="w-full flex flex-col gap-8 select-none">
      {/* Header with the filter toggle */}
      <div className="dash-view-head">
        <div className="section-accent-title-gold">
          <h2 className="dash-view-title text-xl">مسابقاتي وتحدياتي</h2>
        </div>

        <SlidingSegmentedControl
          options={COMP_FILTERS}
          value={filterMode}
          onChange={setFilterMode}
          tone="gold"
          aria-label="تصفية المسابقات"
          className="w-full sm:w-80"
        />
      </div>

      {/* Competitions list */}
      <div className="flex flex-col gap-3">
        {isLoadingCompetitions ? (
          <DataSectionSkeleton variant="list" count={3} />
        ) : (
          competitions.map((comp, idx) => (
            <div
              key={comp.id}
              className="dash-row p-4 shadow-none gap-4 animate-pop-in"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              {/* Right: text details */}
              <div className="dash-row-info">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-gold-400 shrink-0" />
                  <h3 className="dash-row-title">{comp.title}</h3>
                </div>

                <div className="inline-flex justify-start items-center gap-2 pr-6">
                  <span className={`size-2 rounded-full shrink-0 ${STATUS_DOT[comp.statusColor]}`} />
                  <span className="dash-meta">{comp.statusText}</span>
                </div>
              </div>

              {/* Left: action CTA */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenArena?.(comp)}
                  className={comp.actionVariant === 'gold' ? 'btn-gold' : 'dash-cta-blue'}
                >
                  {comp.actionLabel}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Certificates grid */}
      <div className="flex flex-col gap-4 pt-2">
        <div className="section-accent-title-gold">
          <h2 className="dash-view-title text-xl text-right">شهاداتي المكتملة</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoadingCertificates ? (
            <DataSectionSkeleton variant="grid" count={2} className="md:col-span-2" />
          ) : (
            certificates.map((cert, idx) => (
              <div
                key={cert.id}
                className="dash-cert-card group animate-pop-in"
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                {/* Official badge row */}
                <div className="flex justify-between items-center">
                  <div className="dash-cert-badge">
                    <Award size={14} className="text-gold-400" />
                    <span className="text-gold-400 text-[11px] font-bold">رسمية ومعتمدة</span>
                  </div>

                  <span className="text-slate-400 text-xs font-mono">{cert.credentialId}</span>
                </div>

                {/* Certificate details */}
                <div className="flex flex-col gap-1 text-right">
                  <h3 className="text-slate-200 text-base font-bold leading-6">{cert.title}</h3>
                  <span className="dash-meta">تاريخ الإصدار: {cert.issueDate}</span>
                </div>

                {/* Download / view CTA */}
                <button
                  type="button"
                  onClick={() => handleDownload(cert)}
                  className="dash-cert-cta"
                >
                  {downloadingId === cert.id ? (
                    <>
                      <span className="size-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span>جاري فتح وثيقة الشهادة...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} strokeWidth={2} />
                      <span>عرض وتحميل الشهادة المعتمدة</span>
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
