import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toArabic } from '@/shared/lib/localization';

interface PaginationProps {
  /** 1-based current page */
  page: number;
  /** total items; pageSize is inferred from API */
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** One shared pager for catalog, admin, studio list views. */
export const Pagination: React.FC<PaginationProps> = ({ page, total, pageSize, onPageChange, className = '' }) => {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <nav aria-label={toArabic('ui', 'pagination')} className={`pagination ${className}`} dir="rtl">
      <button
        type="button"
        disabled={page <= 1}
        title={toArabic('ui', 'prev_page')}
        onClick={() => onPageChange(page - 1)}
        className="pagination-btn"
        aria-label={toArabic('ui', 'prev_page')}
      >
        <ChevronRight size={16} />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={`pagination-page ${p === page ? 'pagination-page-active' : 'pagination-page-idle'}`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        disabled={page >= pageCount}
        title={toArabic('ui', 'next_page')}
        onClick={() => onPageChange(page + 1)}
        className="pagination-btn"
        aria-label={toArabic('ui', 'next_page')}
      >
        <ChevronLeft size={16} />
      </button>

      <span className="pagination-info">
        {toArabic('ui', 'page')} {page} {toArabic('ui', 'page_of')} {pageCount}
      </span>
    </nav>
  );
};
