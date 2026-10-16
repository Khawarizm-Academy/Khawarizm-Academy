import React from 'react';
import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react';

interface AdminEmptyStateProps {
  title: string;
  hint?: string;
  /** True when the section failed to load, which swaps the copy and adds a retry. */
  isError?: boolean;
  onRetry?: () => void;
}

/** One empty/error state for every console section, so no view invents its own. */
export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({ title, hint, isError = false, onRetry }) => (
  <div className="admin-empty" role={isError ? 'alert' : 'status'}>
    <span className="admin-empty-icon">
      {isError ? <TriangleAlert size={20} /> : <Inbox size={20} />}
    </span>
    <p className="admin-empty-title">{title}</p>
    {hint && <p className="admin-empty-hint">{hint}</p>}
    {isError && onRetry && (
      <button type="button" onClick={onRetry} className="admin-retry-btn">
        <RefreshCw size={14} />
        <span>أعد المحاولة</span>
      </button>
    )}
  </div>
);
