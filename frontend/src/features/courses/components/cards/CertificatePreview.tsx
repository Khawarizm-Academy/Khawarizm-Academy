import React from 'react';
import { Award } from 'lucide-react';
import { courseCopy } from '@/features/courses/data/courseCopy';
import type { CourseDetail } from '@/shared/types/entities';

interface CertificatePreviewProps {
  course: CourseDetail;
  studentName: string;
  serial: string;
  score: number;
  dateLabel: string;
}

/** The framed certificate: seal, student name, course title, score, serial + date. */
export const CertificatePreview: React.FC<CertificatePreviewProps> = ({
  course,
  studentName,
  serial,
  score,
  dateLabel,
}) => (
  <div className="cert-frame animate-pop-in">
    <div className="cert-frame-inner">
      <div className="cert-watermark" />

      <div className="cert-seal">
        <Award size={30} />
      </div>

      <p className="cert-certifies">{courseCopy.certificate.certifiesLine}</p>
      <p className="cert-name">{studentName}</p>
      <p className="cert-completed">{courseCopy.certificate.completedLine}</p>
      <h2 className="cert-course">{course.title}</h2>

      <span className="cert-score">
        {courseCopy.certificate.scoreLine}: {score}%
      </span>

      <div className="cert-meta">
        <span className="flex items-center gap-1.5">
          {courseCopy.certificate.serialLabel}: {serial}
        </span>
        <span>{dateLabel}</span>
      </div>
    </div>
  </div>
);