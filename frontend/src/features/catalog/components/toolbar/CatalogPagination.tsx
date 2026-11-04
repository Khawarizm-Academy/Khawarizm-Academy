import React from 'react';
import { Pagination } from '@/shared/components/ui/Pagination';

interface CatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
}

export const CatalogPagination: React.FC<CatalogPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  total,
  pageSize = 20,
}) => {
  if (total !== undefined) {
    return <Pagination page={currentPage} total={total} pageSize={pageSize} onPageChange={onPageChange} className="catalog-pagination" />;
  }
  return <Pagination page={currentPage} total={totalPages * pageSize} pageSize={pageSize} onPageChange={onPageChange} className="catalog-pagination" />;
};
