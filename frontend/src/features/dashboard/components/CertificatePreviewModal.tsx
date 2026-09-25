import React from 'react';
import { Award } from 'lucide-react';
import type { CertificateItem } from '../types';

interface CertificatePreviewModalProps {
  certificate: CertificateItem;
  onClose: () => void;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  certificate,
  onClose,
}) => (
  <div
    dir="rtl"
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none"
  >
    <div className="w-full max-w-lg workspace-card p-6 rounded-3xl border border-[#E5B65C]/60 shadow-2xl space-y-5 text-center relative overflow-hidden">
      <div className="size-16 rounded-2xl bg-[#E5B65C]/15 border border-[#E5B65C]/40 mx-auto flex items-center justify-center text-[#E5B65C]">
        <Award size={32} />
      </div>
      <div>
        <span className="text-[#E5B65C] font-bold text-xs font-mono uppercase">شهادة موثقة ورسمية</span>
        <h3 className="text-slate-100 font-bold font-['IBM_Plex_Sans_Arabic'] text-lg mt-1">
          {certificate.title}
        </h3>
        <p className="text-slate-400 text-xs font-['Tajawal'] mt-1">
          رقم الاعتماد الدولي: <span className="font-mono text-sky-300">{certificate.credentialId}</span>
        </p>
      </div>
      <div className="p-4 bg-blue-950/40 rounded-2xl border border-blue-900/40 text-xs text-slate-300 space-y-1.5 text-right font-['Tajawal']">
        <div>
          الممنوحة إلى: <strong className="text-white">أحمد الغامدي</strong>
        </div>
        <div>تاريخ الإصدار: {certificate.issueDate}</div>
        <div>
          حالة الاعتماد: <span className="text-emerald-400 font-bold">معتمدة ومسجلة في السجل الأكاديمي ✓</span>
        </div>
      </div>
      <button type="button" onClick={onClose} className="btn-gold w-full text-sm font-bold">
        إغلاق الوثيقة
      </button>
    </div>
  </div>
);