import React from 'react';
import { Eye } from 'lucide-react';
import { ActiveBadge } from '@/features/admin/components/cards/Badges';
import { RoleSelect } from '@/features/admin/components/controls/RoleSelect';
import { formatCount, formatLastSeenShort, formatShortDateTime, initialsOf } from '@/features/admin/data/adminFormatters';
import type { AdminUserRow } from '@/features/admin/types';
import type { AuthRole } from '@/features/auth/types';

interface UsersTableProps {
  rows: AdminUserRow[];
  /** The signed-in admin's own row can never be demoted from the console. */
  currentUserId: string;
  changingRoleId: string | null;
  onOpen: (userId: string) => void;
  onChangeRole: (userId: string, role: AuthRole) => void;
}

const COLUMNS = ['المستخدم', 'الدور', 'الحالة', 'الجلسات النشطة', 'تاريخ الانضمام', 'آخر ظهور'];

/** Users table: filters live in the toolbar, one row opens the detail panel. */
export const UsersTable: React.FC<UsersTableProps> = ({
  rows,
  currentUserId,
  changingRoleId,
  onOpen,
  onChangeRole,
}) => (
  <div className="admin-table">
    <div className="admin-table-head" aria-hidden="true">
      {COLUMNS.map((column) => (
        <span key={column}>{column}</span>
      ))}
    </div>

    {rows.map((row) => (
      <div
        key={row.id}
        role="button"
        tabIndex={0}
        aria-label={`ملف ${row.fullName}`}
        className="admin-table-row"
        onClick={() => onOpen(row.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(row.id);
          }
        }}
      >
        <div className="admin-cell admin-cell-user">
          <span className="admin-cell-label">المستخدم</span>
          <span className="admin-user">
            <span className="admin-user-avatar">{initialsOf(row.fullName, row.email.slice(0, 1))}</span>
            <span className="admin-user-text">
              <span className="admin-user-name">{row.fullName}</span>
              <span className="admin-user-email">{row.email}</span>
            </span>
          </span>
        </div>

        <div className="admin-cell">
          <span className="admin-cell-label">الدور</span>
          <RoleSelect
            value={row.role}
            disabled={row.id === currentUserId || changingRoleId === row.id}
            onChange={(role) => onChangeRole(row.id, role)}
          />
        </div>

        <div className="admin-cell">
          <span className="admin-cell-label">الحالة</span>
          <span className="admin-cell-value admin-actions">
            <ActiveBadge isActive={row.isActive} />
            <span className="admin-row-open" aria-hidden="true">
              <Eye size={15} />
            </span>
          </span>
        </div>

        <div className="admin-cell">
          <span className="admin-cell-label">الجلسات النشطة</span>
          <span className="admin-cell-value admin-num">{formatCount(row.activeSessions)}</span>
        </div>

        <div className="admin-cell">
          <span className="admin-cell-label">تاريخ الانضمام</span>
          <span className="admin-cell-value">{formatShortDateTime(row.joinedAt)}</span>
        </div>

        <div className="admin-cell">
          <span className="admin-cell-label">آخر ظهور</span>
          <span className="admin-cell-value">{formatLastSeenShort(row.lastSeenAt)}</span>
        </div>
      </div>
    ))}
  </div>
);
