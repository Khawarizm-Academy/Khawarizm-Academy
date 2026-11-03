import React, { useCallback } from 'react';
import { ArrowLeft, BadgeCheck, BadgeX } from 'lucide-react';
import { useParams, useNavigate } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { StatePanel } from '@/shared/components/State/StatePanel';
import { fetchCertificateVerification } from '@/features/certificates/data/certificateFetchers';
import { certificateCopy } from '@/features/certificates/data/certificateCopy';
import { CertificatePrintCard } from '@/features/certificates/components/CertificatePrintCard';
import './certificates.css';

export const CertificateVerifyPage: React.FC = () => {
  const { serial = '' } = useParams<{ serial: string }>();
  const navigate = useNavigate();
  const fetcher = useCallback(() => fetchCertificateVerification(serial), [serial]);
  const query = useCachedData(['certificate-verify', serial], fetcher, { staleTime: 5 * 60 * 1000, cacheTime: 30 * 60 * 1000 });

  if (query.isLoading) return <main className="content-container"><DataSectionSkeleton variant="list" count={4} /></main>;
  if (query.isError) return <main className="content-container"><StatePanel title={certificateCopy.unavailable} action={<button type="button" onClick={() => void query.refetch()}>إعادة المحاولة</button>} /></main>;

  return (
    <main className="content-container certificate-verify-page">
      <button type="button" className="certificate-verify-page__back" onClick={() => navigate('/')}><ArrowLeft size={16} />{certificateCopy.backHome}</button>
      <div className="certificate-verify-page__heading">
        {query.data?.valid ? <BadgeCheck size={30} /> : <BadgeX size={30} />}
        <h1>{certificateCopy.verifyTitle}</h1>
        <p>{certificateCopy.verifySubtitle}</p>
      </div>
      {query.data ? <CertificatePrintCard serial={serial} certificate={query.data} /> : <StatePanel title={certificateCopy.notFound} />}
    </main>
  );
};
