import React, { useState } from 'react';
import { ArrowLeft, Download, PartyPopper, Share2 } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { flattenLessons } from '@/features/courses/data/coursePath';
import { CertificatePreview } from '@/features/courses/components/cards/CertificatePreview';
import type { CourseDetail } from '@/shared/types/entities';

interface CertificateViewProps {
  course: CourseDetail;
  score: number;
  hours: number;
  serial: string;
  dateLabel: string;
}

interface ActionState {
  kind: 'idle' | 'done';
}

/** Flips a button to its "done" state for a couple of seconds, then settles back. */
function flashAction(setState: (next: ActionState) => void) {
  setState({ kind: 'done' });
  window.setTimeout(() => setState({ kind: 'idle' }), 2200);
}

/** Single completion screen — the stats and certificate differ not by surface. */
export const CertificateView: React.FC<CertificateViewProps> = ({
  course,
  score,
  hours,
  serial,
  dateLabel,
}) => {
  const navigate = useNavigate();
  const [download, setDownload] = useState<ActionState>({ kind: 'idle' });
  const [share, setShare] = useState<ActionState>({ kind: 'idle' });

  const lessons = flattenLessons(course.modules).length;
  const stats = [
    { value: String(lessons), label: courseCopy.certificate.statLessons },
    { value: `${score}%`, label: courseCopy.certificate.statScore },
    { value: hours.toLocaleString('ar-EG'), label: courseCopy.certificate.statHours },
  ];

  return (
    <div className="cert-stage">
      <button type="button" onClick={() => navigate(NAV_TARGETS.dashboard)} className="course-back animate-fade-in-up">
        <ArrowLeft size={16} />
        {courseCopy.certificate.backLabel}
      </button>

      <div className="cert-burst animate-pop-in">
        <div className="cert-burst-ring" />
        <div className="cert-burst-core">
          <PartyPopper size={26} />
        </div>
      </div>

      <h1 className="cert-heading animate-fade-in-up" style={{ animationDelay: '80ms' }}>{courseCopy.certificate.title}</h1>
      <p className="cert-subtitle animate-fade-in-up" style={{ animationDelay: '140ms' }}>{courseCopy.certificate.subtitle}</p>

      <div className="cert-stats">
        {stats.map((stat, idx) => (
          <div key={stat.label} className="cert-stat animate-pop-in" style={{ animationDelay: `${200 + idx * 80}ms` }}>
            <span className="cert-stat-value">{stat.value}</span>
            <span className="cert-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <CertificatePreview
        course={course}
        studentName={courseCopy.certificate.defaultStudent}
        serial={serial}
        score={score}
        dateLabel={dateLabel}
      />

      <div className="cert-actions animate-fade-in-up" style={{ animationDelay: '420ms' }}>
        <button type="button" onClick={() => flashAction(setDownload)} className="btn-gold">
          <Download size={15} />
          {download.kind === 'done' ? courseCopy.certificate.downloadDone : courseCopy.certificate.download}
        </button>
        <button type="button" onClick={() => flashAction(setShare)} className="btn-outline-blue">
          <Share2 size={15} />
          {share.kind === 'done' ? courseCopy.certificate.shareDone : courseCopy.certificate.share}
        </button>
      </div>
    </div>
  );
};