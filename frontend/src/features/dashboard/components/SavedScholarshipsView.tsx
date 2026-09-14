import React, { useState } from 'react';
import type { SavedScholarshipItem } from '../types';
import { mockSavedScholarships, mockFavoriteCourses } from '../data/mockDashboardData';

interface SavedScholarshipsViewProps {
  onExploreMore?: () => void;
}

export const SavedScholarshipsView: React.FC<SavedScholarshipsViewProps> = ({
  onExploreMore,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'scholarships' | 'courses'>('scholarships');
  const [scholarships, setScholarships] = useState<SavedScholarshipItem[]>(mockSavedScholarships);
  const [favoriteCourses, setFavoriteCourses] = useState<SavedScholarshipItem[]>(mockFavoriteCourses);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleRemove = (id: string, isScholarship: boolean) => {
    if (isScholarship) {
      setScholarships((prev) => prev.filter((item) => item.id !== id));
      showToast('تمت إزالة المنحة من قائمة المحفوظات');
    } else {
      setFavoriteCourses((prev) => prev.filter((item) => item.id !== id));
      showToast('تمت إزالة الدورة من قائمة المفضلة');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentItems = activeSubTab === 'scholarships' ? scholarships : favoriteCourses;

  return (
    <div className="flex flex-col gap-6 w-full animate-page-enter">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#061A3A] border border-[#29A9FF]/60 text-xs sm:text-sm text-[#DCE5EE] shadow-[0_4px_20px_rgba(0,0,0,0.6)] animate-page-enter">
          {toastMessage}
        </div>
      )}

      {/* Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1B3F80]/30">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#F1F5F9] font-['Cairo',sans-serif]">
            إدارة المحفوظات
          </h2>
          <p className="text-xs sm:text-sm text-[#8299B5] font-['Tajawal',sans-serif] mt-0.5">
            تابع المنح الدراسية والدورات المفضلة والتقديمات القادمة بانتظام.
          </p>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#040F24]/90 border border-[#167BDB]/30 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('scholarships')}
            className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-['Tajawal'] font-bold transition-colors cursor-pointer ${
              activeSubTab === 'scholarships'
                ? 'bg-[#167BDB]/30 text-[#29A9FF] border border-[#29A9FF]/50 shadow-[0_0_8px_rgba(41,169,255,0.3)]'
                : 'text-[#8299B5] hover:text-[#DCE5EE]'
            }`}
          >
            المنح المحفوظة ({scholarships.length})
          </button>
          <button
            onClick={() => setActiveSubTab('courses')}
            className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-['Tajawal'] font-bold transition-colors cursor-pointer ${
              activeSubTab === 'courses'
                ? 'bg-[#E5B65C]/20 text-[#E5B65C] border border-[#E5B65C]/50 shadow-[0_0_8px_rgba(229,182,92,0.3)]'
                : 'text-[#8299B5] hover:text-[#DCE5EE]'
            }`}
          >
            الدورات المفضلة ({favoriteCourses.length})
          </button>
        </div>
      </div>

      {/* Saved Items List */}
      {currentItems.length === 0 ? (
        <div className="p-8 text-center glass-panel rounded-2xl border border-[#167BDB]/30 flex flex-col items-center gap-4">
          <span className="text-3xl">🔖</span>
          <p className="text-sm text-[#8299B5] font-['Tajawal']">
            لا توجد عناصر محفوظة في هذا القسم حاليًا.
          </p>
          <button
            onClick={onExploreMore}
            className="btn-outline-blue py-2 px-5 text-xs font-bold font-['Cairo']"
          >
            استكشف الفرص والدورات
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {currentItems.map((item) => {
            const isScholarship = activeSubTab === 'scholarships';
            return (
              <div
                key={item.id}
                className="card-interactive-blue flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#061A3A]/80 border border-[#167BDB]/30 hover:border-[#29A9FF]/60 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-200"
              >
                {/* 1. Item Title & Provider on the Right in RTL */}
                <div className="flex flex-col gap-1 min-w-0 flex-1 text-right">
                  <h3 className="text-sm sm:text-base font-bold text-[#F1F5F9] font-['Cairo',sans-serif]">
                    {item.title}
                  </h3>
                  <span className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
                    {item.provider}
                  </span>
                </div>

                {/* 2. Urgency Badge & Remove Button on the Left in RTL */}
                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  {/* Deadline Urgency Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-['Tajawal',sans-serif] ${
                      item.isUrgent
                        ? 'bg-[#FF4D4D]/15 text-[#FF6B6B] border border-[#FF4D4D]/40 shadow-[0_0_10px_rgba(255,77,77,0.2)] animate-pulse'
                        : 'bg-[#167BDB]/15 text-[#29A9FF] border border-[#167BDB]/30'
                    }`}
                  >
                    {item.isUrgent && <span className="size-1.5 rounded-full bg-[#FF4D4D]" />}
                    <span>{item.deadlineText}</span>
                  </span>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(item.id, isScholarship)}
                    className="p-2 rounded-xl bg-[#040F24]/80 hover:bg-[#FF4D4D]/20 border border-[#1B3F80]/40 hover:border-[#FF4D4D]/40 text-[#8299B5] hover:text-[#FF6B6B] transition-colors cursor-pointer"
                    title="إزالة من المحفوظات"
                    aria-label="إزالة من المحفوظات"
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
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
