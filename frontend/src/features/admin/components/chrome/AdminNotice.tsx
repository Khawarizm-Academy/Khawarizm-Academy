import React from 'react';
import { TriangleAlert, X } from 'lucide-react';

interface AdminNoticeProps {
  message: string | null;
  onDismiss: () => void;
}

/** Console-wide error banner for a failed action; renders nothing when clean. */
export const AdminNotice: React.FC<AdminNoticeProps> = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div className="admin-notice" role="alert">
      <span className="admin-notice-lead">
        <TriangleAlert size={14} className="shrink-0" />
        <span>{message}</span>
      </span>
      <button type="button" className="admin-notice-close" aria-label="إخفاء التنبيه" onClick={onDismiss}>
        <X size={14} />
      </button>
    </div>
  );
};
