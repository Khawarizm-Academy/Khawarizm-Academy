import React from 'react';
import { Award, Check } from 'lucide-react';
import type { CertificateItem } from '../types';

interface CertificatePreviewModalProps {
  certificate: CertificateItem;
  onClose: () => void;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  certificate,
  onClose,
}) => (
  <div dir="rtl" className="dash-modal-overlay">
    <div className="w-full max-w-lg workspace-card p-6 rounded-3xl border border-gold-400/60 shadow-2xl space-y-5 text-center relative overflow-hidden">
      <div className="size-16 rounded-2xl bg-gold-400/15 border border-gold-400/40 mx-auto flex items-center justify-center text-gold-400">
        <Award size={32} />
      </div>
      <div>
        <span className="text-gold-400 font-bold text-xs font-mono uppercase">
          شهادة موثقة ورسمية
        </span>
        <h3 className="text-slate-100 font-bold font-display text-lg mt-1">{certificate.title}</h3>
        <p className="text-slate-400 text-xs mt-1">
          رقم الاعتماد الدولي:{' '}
          <span className="font-mono text-sky-300">{certificate.credentialId}</span>
        </p>
      </div>
      <div className="p-4 bg-navy-950/40 rounded-2xl border border-navy-600/40 text-xs text-slate-300 space-y-1.5 text-right">
        <div>
          الممنوحة إلى: <strong className="text-white">أحمد الغامدي</strong>
        </div>
        <div>تاريخ الإصدار: {certificate.issueDate}</div>
        <div>
          حالة الاعتماد:{' '}
          <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
            معتمدة ومسجلة في السجل الأكاديمي
            <Check size={13} strokeWidth={3} />
          </span>
        </div>
      </div>
      <button type="button" onClick={onClose} className="btn-gold w-full text-sm font-bold">
        إغلاق الوثيقة
      </button>
    </div>
  </div>
);
