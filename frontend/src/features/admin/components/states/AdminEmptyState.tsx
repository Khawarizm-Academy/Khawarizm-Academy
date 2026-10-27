import React from 'react';
import { Inbox, OctagonAlert, RotateCcw, type LucideIcon } from 'lucide-react';

interface AdminEmptyStateProps {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  /** True when the section failed to load, which swaps the copy and adds a retry. */
  isError?: boolean;
  onRetry?: () => void;
}

/** One empty/error state for every console section, so no view invents its own. */
export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  title,
  hint,
  icon: EmptyIcon = Inbox,
  isError = false,
  onRetry,
}) => (
  <div className="admin-empty" role={isError ? 'alert' : 'status'}>
    <span className={`admin-empty-icon ${isError ? 'admin-empty-icon-error' : ''}`}>
      {isError ? <OctagonAlert size={22} strokeWidth={1.8} /> : <EmptyIcon size={22} strokeWidth={1.8} />}
    </span>
    <p className="admin-empty-title">{title}</p>
    {hint && <p className="admin-empty-hint">{hint}</p>}
    {isError && onRetry && (
      <button type="button" onClick={onRetry} className="admin-retry-btn">
        <RotateCcw size={14} />
        <span>إعادة المحاولة</span>
      </button>
    )}
  </div>
);
