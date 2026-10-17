import React from 'react';
import { Ban, Loader2 } from 'lucide-react';
import { SessionStatusBadge } from '@/features/admin/components/cards/Badges';
import { formatLastSeenShort, initialsOf } from '@/features/admin/data/adminFormatters';
import { DEVICE_LABELS, ROLE_LABELS, type AdminSessionWithUser } from '@/features/admin/types';

interface SessionsTableProps {
  rows: AdminSessionWithUser[];
  revokingSessionId: string | null;
  onRevoke: (sessionId: string) => void;
}

const COLUMNS = ['المستخدم', 'الجهاز', 'عنوان IP', 'آخر ظهور', 'الحالة', 'إجراء'];

/** Fleet-wide device list; the reader's own device can never be revoked from here. */
export const SessionsTable: React.FC<SessionsTableProps> = ({ rows, revokingSessionId, onRevoke }) => (
  <div className="admin-table">
    <div className="admin-table-head" aria-hidden="true">
      {COLUMNS.map((column) => (
        <span key={column}>{column}</span>
      ))}
    </div>

    {rows.map((row) => {
      const isRevoking = revokingSessionId === row.id;
      const canRevoke = row.isActive && !row.isCurrent;

      return (
        <div key={row.id} className="admin-table-row admin-table-row-static">
          <div className="admin-cell admin-cell-user">
            <span className="admin-cell-label">المستخدم</span>
            <span className="admin-user">
              <span className="admin-user-avatar">{initialsOf(row.user.fullName, row.user.email.slice(0, 1))}</span>
              <span className="admin-user-text">
                <span className="admin-user-name">{row.user.fullName}</span>
                <span className="admin-user-email">
                  {row.user.email} · {ROLE_LABELS[row.user.role]}
                </span>
              </span>
            </span>
          </div>

          <div className="admin-cell">
            <span className="admin-cell-label">الجهاز</span>
            <span className="admin-cell-value">
              {DEVICE_LABELS[row.deviceType] ?? row.deviceType}
              <span className="admin-cell-sub">
                {row.os} · {row.browser}
              </span>
            </span>
          </div>

          <div className="admin-cell">
            <span className="admin-cell-label">عنوان IP</span>
            <span className="admin-cell-value admin-mono">{row.ipAddress || '—'}</span>
          </div>

          <div className="admin-cell">
            <span className="admin-cell-label">آخر ظهور</span>
            <span className="admin-cell-value">{formatLastSeenShort(row.lastSeenAt)}</span>
          </div>

          <div className="admin-cell">
            <span className="admin-cell-label">الحالة</span>
            <span className="admin-cell-value">
              <SessionStatusBadge session={row} />
            </span>
          </div>

          <div className="admin-cell">
            <span className="admin-cell-label">إجراء</span>
            <span className="admin-cell-value">
              <button
                type="button"
                className="admin-revoke-btn"
                disabled={!canRevoke || isRevoking}
                title={row.isCurrent ? 'هذه جلستك الحالية' : 'إنهاء الجلسة من هذا الجهاز'}
                onClick={() => onRevoke(row.id)}
              >
                {isRevoking ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                <span>{isRevoking ? 'جارٍ الإنهاء' : 'إنهاء'}</span>
              </button>
            </span>
          </div>
        </div>
      );
    })}
  </div>
);
