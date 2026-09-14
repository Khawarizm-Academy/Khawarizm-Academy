import React, { useState } from 'react';
import type { CompetitionItem, CertificateItem } from '../types';
import { mockCompetitions, mockCertificates } from '../data/mockDashboardData';

export const CompetitionsCertificatesView: React.FC = () => {
  const [competitions] = useState<CompetitionItem[]>(mockCompetitions);
  const [certificates] = useState<CertificateItem[]>(mockCertificates);
  const [filterState, setFilterState] = useState<'all' | 'completed'>('all');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const handleDownload = (certTitle: string) => {
    setDownloadToast(`جاري تجهيز وتحميل شهادة: ${certTitle}`);
    setTimeout(() => setDownloadToast(null), 3500);
  };

  const filteredCompetitions =
    filterState === 'completed'
      ? competitions.filter((c) => c.status === 'completed')
      : competitions;

  return (
    <div className="flex flex-col gap-10 w-full animate-page-enter">
      {/* Toast Notification */}
      {downloadToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#061A3A] border border-[#E5B65C]/60 text-xs sm:text-sm text-[#E5B65C] shadow-[0_4px_20px_rgba(0,0,0,0.6)] animate-page-enter">
          {downloadToast}
        </div>
      )}

      {/* 1. Competitions Section */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1B3F80]/30">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] font-['Cairo',sans-serif]">
              مسابقاتي وتحدياتي
            </h2>
            <p className="text-xs sm:text-sm text-[#8299B5] font-['Tajawal',sans-serif] mt-0.5">
              سجل التحديات البرمجية الحية والمسابقات الرسمية المعتمدة.
            </p>
          </div>

          {/* Sub-Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#040F24]/90 border border-[#167BDB]/30 self-start sm:self-auto">
            <button
              onClick={() => setFilterState('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-['Tajawal'] font-bold transition-colors cursor-pointer ${
                filterState === 'all'
                  ? 'bg-[#167BDB]/30 text-[#29A9FF] border border-[#29A9FF]/50'
                  : 'text-[#8299B5] hover:text-[#DCE5EE]'
              }`}
            >
              جميع التحديات ({competitions.length})
            </button>
            <button
              onClick={() => setFilterState('completed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-['Tajawal'] font-bold transition-colors cursor-pointer ${
                filterState === 'completed'
                  ? 'bg-[#E5B65C]/20 text-[#E5B65C] border border-[#E5B65C]/50'
                : 'text-[#8299B5] hover:text-[#DCE5EE]'
              }`}
            >
              المكتملة فقط
            </button>
          </div>
        </div>

        {/* Competitions Cards */}
        <div className="flex flex-col gap-3.5">
          {filteredCompetitions.map((comp) => {
            const isLive = comp.status === 'live';
            const isCompleted = comp.status === 'completed';

            return (
              <div
                key={comp.id}
                className={`card-interactive-blue flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#061A3A]/80 border transition-all duration-200 ${
                  isLive
                    ? 'border-[#E5B65C]/60 shadow-[0_0_15px_rgba(229,182,92,0.15)]'
                    : 'border-[#167BDB]/30 hover:border-[#29A9FF]/60'
                }`}
              >
                {/* Right: Competition Title & Status */}
                <div className="flex flex-col gap-1 min-w-0 flex-1 text-right">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-[#F1F5F9] font-['Cairo',sans-serif]">
                      {comp.title}
                    </h3>
                    {isLive && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF6B6B] bg-[#FF4D4D]/15 px-2 py-0.5 rounded-full">
                        <span className="size-1.5 rounded-full bg-[#FF4D4D] animate-ping" />
                        مباشر
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
                    {comp.statusLabel}
                  </span>
                </div>

                {/* Left: Context-Appropriate Action CTA */}
                <div className="shrink-0 self-end sm:self-auto">
                  {isLive ? (
                    <button className="btn-gold px-5 py-2 text-xs sm:text-sm font-bold font-['Cairo'] shadow-[0_0_12px_rgba(229,182,92,0.3)] cursor-pointer active:scale-95">
                      ادخل الساحة
                    </button>
                  ) : isCompleted ? (
                    <button className="btn-outline-blue px-4 py-2 text-xs sm:text-sm font-bold font-['Cairo'] cursor-pointer active:scale-95">
                      عرض النتائج
                    </button>
                  ) : (
                    <button className="btn-outline-blue px-4 py-2 text-xs sm:text-sm font-bold font-['Cairo'] cursor-pointer active:scale-95">
                      عرض التفاصيل
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Completed Certificates Section */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between pb-2 border-b border-[#1B3F80]/30">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] font-['Cairo',sans-serif]">
              شهاداتي المكتملة
            </h2>
            <p className="text-xs sm:text-sm text-[#8299B5] font-['Tajawal',sans-serif] mt-0.5">
              شهادات التخرج الموثقة والمعتمدة الصادرة من الأكاديمية والشركاء الدوليين.
            </p>
          </div>
          <span className="badge-gold">{certificates.length} شهادات موثقة</span>
        </div>

        {/* Certificates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="card-interactive-gold p-5 rounded-2xl bg-gradient-to-b from-[#061A3A] to-[#040F24] border border-[#E5B65C]/40 hover:border-[#E5B65C]/80 shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex flex-col justify-between gap-5 transition-all duration-300"
            >
              {/* Card Top: Official Badge and Verified Icon */}
              <div className="flex items-center justify-between">
                <span className="badge-gold text-[10px] py-0.5 px-2">رسمية ومعتمدة</span>
                <span className="text-[#E5B65C] text-lg" title="شهادة موثقة">
                  🎖️
                </span>
              </div>

              {/* Certificate Title & Date */}
              <div className="flex flex-col gap-1 text-right">
                <h3 className="text-base font-bold text-[#F1F5F9] font-['Cairo',sans-serif] line-clamp-2">
                  {cert.title}
                </h3>
                <span className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
                  تاريخ الإصدار: {cert.issueDate}
                </span>
              </div>

              {/* Download Action */}
              <button
                onClick={() => handleDownload(cert.title)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0F2B5C]/70 hover:bg-[#167BDB]/30 border border-[#29A9FF]/40 hover:border-[#29A9FF] text-xs font-bold font-['Cairo',sans-serif] text-[#29A9FF] hover:text-[#DCE5EE] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>تحميل الشهادة (PDF)</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
