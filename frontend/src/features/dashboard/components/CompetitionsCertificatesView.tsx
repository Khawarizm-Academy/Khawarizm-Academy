import React, { useState } from 'react';
import { Trophy, Award, Download } from 'lucide-react';

export interface CompetitionItem {
  id: string;
  title: string;
  statusText: string;
  statusColor: 'blue' | 'red' | 'green';
  actionLabel: string;
  actionVariant: 'gold' | 'sky';
}

export interface CertificateItem {
  id: string;
  title: string;
  issueDate: string;
  credentialId: string;
  isOfficial: boolean;
}

const mockCompetitions: CompetitionItem[] = [
  {
    id: 'comp-1',
    title: 'تحدي الخوارزميات الشتوي',
    statusText: 'مسجل ومجدول في يناير',
    statusColor: 'blue',
    actionLabel: 'عرض التفاصيل',
    actionVariant: 'sky',
  },
  {
    id: 'comp-2',
    title: 'مسابقة البرمجة التنافسية للأكاديميات',
    statusText: 'جارية الآن (تحدي البث المباشر)',
    statusColor: 'red',
    actionLabel: 'ادخل الساحة',
    actionVariant: 'gold',
  },
  {
    id: 'comp-3',
    title: 'هاكاثون الابتكار الوطني',
    statusText: 'انتهت • حققت المركز الثالث',
    statusColor: 'green',
    actionLabel: 'عرض النتائج',
    actionVariant: 'sky',
  },
];

const mockCertificates: CertificateItem[] = [
  {
    id: 'cert-1',
    title: 'شهادة إتمام: أساسيات الذكاء الاصطناعي التوليدي',
    issueDate: '10 يناير 2026',
    credentialId: 'KHW-AI-89421',
    isOfficial: true,
  },
  {
    id: 'cert-2',
    title: 'شهادة إتمام: تصميم واجهات وتجربة المستخدم المتقدمة',
    issueDate: '28 ديسمبر 2025',
    credentialId: 'KHW-UX-77319',
    isOfficial: true,
  },
];

interface CompetitionsCertificatesViewProps {
  onOpenArena?: (comp: CompetitionItem) => void;
  onPreviewCertificate?: (cert: CertificateItem) => void;
}

export const CompetitionsCertificatesView: React.FC<CompetitionsCertificatesViewProps> = ({
  onOpenArena,
  onPreviewCertificate,
}) => {
  const [filterMode, setFilterMode] = useState<'completed' | 'active'>('completed');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = (cert: CertificateItem) => {
    setDownloadingId(cert.id);
    setTimeout(() => {
      setDownloadingId(null);
      onPreviewCertificate?.(cert);
    }, 1000);
  };

  return (
    <div dir="rtl" className="w-full flex flex-col gap-8 select-none">
      {/* Header-Filter matching Figma */}
      <div
        data-layer="Header-Filter"
        className="HeaderFilter self-stretch flex justify-between items-center flex-wrap gap-4"
      >
        <h2
          data-layer="مسابقاتي وتحدياتي"
          className="text-slate-200 text-xl font-bold font-['Cairo'] leading-6"
        >
          مسابقاتي وتحدياتي
        </h2>

        {/* Toggle Filter */}
        <div
          data-layer="Toggle-Filter"
          className="ToggleFilter p-1 bg-slate-900 rounded-full outline outline-1 outline-offset-[-1px] outline-blue-900 flex items-center"
        >
          <button
            type="button"
            onClick={() => setFilterMode('completed')}
            className={`px-5 md:px-6 py-2 rounded-full text-xs md:text-sm transition-all cursor-pointer ${
              filterMode === 'completed'
                ? 'bg-[#E5B65C]/15 text-[#E5B65C] font-bold outline outline-1 outline-[#E5B65C]/50'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            أكمل المسابقة
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('active')}
            className={`px-5 md:px-6 py-2 rounded-full text-xs md:text-sm transition-all cursor-pointer ${
              filterMode === 'active'
                ? 'bg-[#E5B65C]/15 text-[#E5B65C] font-bold outline outline-1 outline-[#E5B65C]/50'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            لم يحل المسابقة
          </button>
        </div>
      </div>

      {/* Competitions Section */}
      <div data-layer="Competitions-Section" className="flex flex-col gap-3">
        {mockCompetitions.map((comp) => (
          <div
            key={comp.id}
            data-layer="Competition Row"
            className="CompetitionRow self-stretch p-4 bg-blue-950 rounded-2xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center gap-4 hover:border-sky-400/40 transition-all"
          >
            {/* Right: Text details */}
            <div data-layer="Text details" className="flex-1 flex flex-col justify-start items-start gap-1 text-right min-w-0">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-[#E5B65C] shrink-0" />
                <h3
                  data-layer={comp.title}
                  className="text-slate-200 text-sm md:text-base font-bold font-['Tajawal'] leading-6 truncate w-full"
                >
                  {comp.title}
                </h3>
              </div>
              <div
                data-layer="Status indicator"
                className="StatusIndicator inline-flex justify-start items-center gap-2 pr-6"
              >
                <span
                  className={`size-2 rounded-full shrink-0 ${
                    comp.statusColor === 'red'
                      ? 'bg-red-500 animate-ping'
                      : comp.statusColor === 'green'
                      ? 'bg-emerald-400'
                      : 'bg-sky-400'
                  }`}
                />
                <span
                  data-layer={comp.statusText}
                  className="text-slate-400 text-xs font-normal font-['Tajawal']"
                >
                  {comp.statusText}
                </span>
              </div>
            </div>

            {/* Left: Action CTA */}
            <div data-layer="Action Left" className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenArena?.(comp)}
                data-layer="CTA"
                className={`px-4 md:px-5 py-2.5 rounded-xl text-xs font-bold font-['Tajawal'] transition-all cursor-pointer ${
                  comp.actionVariant === 'gold'
                    ? 'bg-[#E5B65C] hover:bg-amber-300 text-slate-900 shadow-[0_0_12px_rgba(229,182,92,0.3)]'
                    : 'outline outline-1 outline-offset-[-1px] outline-sky-400 text-sky-400 hover:bg-sky-400/10'
                }`}
              >
                {comp.actionLabel}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Certificates Section */}
      <div data-layer="Certificates-Section" className="flex flex-col gap-4 pt-2">
        <h2
          data-layer="شهاداتي المكتملة"
          className="text-slate-200 text-xl font-bold font-['Cairo'] leading-6 text-right"
        >
          شهاداتي المكتملة
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockCertificates.map((cert) => (
            <div
              key={cert.id}
              data-layer="Certificate Card"
              className="p-5 bg-blue-950 rounded-2xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-[#E5B65C]/40 transition-colors"
            >
              {/* Badge Accent Row */}
              <div data-layer="Badge Accent Row" className="flex justify-between items-center">
                <div
                  data-layer="Gold Foil accent"
                  className="px-2.5 py-0.5 bg-[#E5B65C]/10 rounded border border-[#E5B65C] flex items-center gap-1.5"
                >
                  <Award size={14} className="text-[#E5B65C]" />
                  <span className="text-[#E5B65C] text-[11px] font-bold font-['Tajawal']">رسمية ومعتمدة</span>
                </div>

                <span className="text-slate-400 text-xs font-['Tajawal'] font-mono">{cert.credentialId}</span>
              </div>

              {/* Certificate Details */}
              <div className="flex flex-col gap-1 text-right">
                <h3 className="text-slate-200 text-base font-bold font-['Tajawal'] leading-6">{cert.title}</h3>
                <span className="text-slate-400 text-xs font-normal font-['Tajawal']">
                  تاريخ الإصدار: {cert.issueDate}
                </span>
              </div>

              {/* Download / View CTA */}
              <button
                type="button"
                onClick={() => handleDownload(cert)}
                className="self-stretch py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl outline outline-1 outline-blue-900 hover:outline-sky-400 text-sky-400 text-xs font-bold font-['Tajawal'] flex justify-center items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                {downloadingId === cert.id ? (
                  <>
                    <span className="size-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
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
          ))}
        </div>
      </div>
    </div>
  );
};
