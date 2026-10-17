import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCount } from '@/features/admin/data/adminFormatters';

interface AdminPaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** Single-source pager: it reads the same page/pageSize the API returned. */
export const AdminPagination: React.FC<AdminPaginationProps> = ({ total, page, pageSize, onPageChange }) => {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  if (pageCount <= 1) return null;

  return (
    <div className="admin-pagination">
      {/* RTL: previous reads to the right, next to the left. */}
      <button
        type="button"
        className="admin-page-btn"
        aria-label="الصفحة السابقة"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronRight size={16} />
      </button>
      <span className="admin-page-info">
        صفحة {formatCount(page)} من {formatCount(pageCount)} · {formatCount(total)} نتيجة
      </span>
      <button
        type="button"
        className="admin-page-btn"
        aria-label="الصفحة التالية"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronLeft size={16} />
      </button>
    </div>
  );
};
