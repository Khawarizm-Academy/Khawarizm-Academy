import React, { useMemo, useState } from 'react';
import { Award, Check, Clipboard, ExternalLink, Printer } from 'lucide-react';
import { certificateCopy } from '@/features/certificates/data/certificateCopy';
import type { CertificateVerification } from '@/features/certificates/data/certificateFetchers';
import { qrSvg } from '@/features/certificates/utils/qrCode';
import './certificates.css';

interface CertificatePrintCardProps {
  serial: string;
  certificate: CertificateVerification;
}

export const CertificatePrintCard: React.FC<CertificatePrintCardProps> = ({ serial, certificate }) => {
  const [copied, setCopied] = useState(false);
  const verificationUrl = useMemo(() => `${window.location.origin}/verify/${encodeURIComponent(serial)}`, [serial]);
  const qr = useMemo(() => qrSvg(verificationUrl), [verificationUrl]);

  const copyLink = async () => {
    await navigator.clipboard?.writeText(verificationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <article className={`certificate-print-card ${certificate.revoked ? 'certificate-print-card--revoked' : ''}`}>
      <div className="certificate-print-card__watermark" aria-hidden="true" />
      <div className="certificate-print-card__seal"><Award size={34} /></div>
      <p className="certificate-print-card__eyebrow">أكاديمية خوارزم</p>
      <h2 className="certificate-print-card__title">{certificate.courseTitle}</h2>
      <p className="certificate-print-card__learner">{certificate.learnerName}</p>
      <p className="certificate-print-card__status">
        <Check size={16} aria-hidden="true" />
        {certificate.revoked ? certificateCopy.revoked : certificateCopy.valid}
      </p>
      <div className="certificate-print-card__meta">
        <span>{certificateCopy.serial}: <b>{serial}</b></span>
        <span>{certificateCopy.issuedAt}: {certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString('ar-EG') : '—'}</span>
      </div>
      <div className="certificate-print-card__qr">
        <div dangerouslySetInnerHTML={{ __html: qr }} />
        <span>{certificateCopy.qrLabel}</span>
      </div>
      <div className="certificate-print-card__actions" data-print-hidden="true">
        <button type="button" onClick={() => window.print()}><Printer size={16} />{certificateCopy.print}</button>
        <button type="button" onClick={copyLink}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? certificateCopy.copied : certificateCopy.copyLink}</button>
        <a href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(certificate.courseTitle)}&certId=${encodeURIComponent(serial)}&certUrl=${encodeURIComponent(verificationUrl)}`} target="_blank" rel="noreferrer"><ExternalLink size={16} />{certificateCopy.linkedin}</a>
      </div>
    </article>
  );
};
