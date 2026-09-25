import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const CatalogPagination: React.FC<CatalogPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="تنقل الصفحات" className="w-full flex-center gap-2 pt-6 select-none">
      {/* Previous Page Button */}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="w-9 h-9 rounded-lg bg-[#061A3A] border border-[#1B3F80] hover:border-[#29A9FF]/50 text-slate-300 disabled:opacity-40 disabled:pointer-events-none flex-center transition-all cursor-pointer shadow-sm"
        title="الصفحة السابقة"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Numbered Page Buttons */}
      {pages.map((page) => {
        const isActive = page === currentPage;
        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`min-w-9 h-9 px-3 rounded-lg text-xs font-['Tajawal'] font-bold transition-all duration-200 cursor-pointer shadow-sm flex-center ${
              isActive
                ? 'bg-[#E5B65C]/15 border border-[#E5B65C] text-[#E5B65C] shadow-[0_0_12px_rgba(229,182,92,0.3)]'
                : 'bg-[#061A3A] border border-[#1B3F80] text-slate-400 hover:text-white hover:border-[#29A9FF]/40'
            }`}
          >
            {page}
          </button>
        );
      })}

      {/* Next Page Button */}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="w-9 h-9 rounded-lg bg-[#061A3A] border border-[#1B3F80] hover:border-[#29A9FF]/50 text-slate-300 disabled:opacity-40 disabled:pointer-events-none flex-center transition-all cursor-pointer shadow-sm"
        title="الصفحة التالية"
      >
        <ChevronRight size={14} />
      </button>
    </nav>
  );
};
