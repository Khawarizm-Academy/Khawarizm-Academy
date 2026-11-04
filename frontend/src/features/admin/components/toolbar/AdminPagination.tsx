import React from 'react';
import { Pagination } from '@/shared/components/ui/Pagination';

interface AdminPaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** Single-source pager: it reads the same page/pageSize the API returned. */
export const AdminPagination: React.FC<AdminPaginationProps> = ({ total, page, pageSize, onPageChange }) => {
  return <Pagination page={page} total={total} pageSize={pageSize} onPageChange={onPageChange} className="admin-pagination" />;
};
