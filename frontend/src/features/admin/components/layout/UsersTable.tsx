import React from 'react';
import { Eye } from 'lucide-react';
import { UserAvatar } from '@/shared/components/Artwork/UserAvatar';
import { ActiveBadge } from '@/features/admin/components/cards/Badges';
import { RoleChips } from '@/features/admin/components/controls/RoleChips';
import { formatCount, formatLastSeenShort, formatShortDateTime, initialsOf } from '@/features/admin/data/adminFormatters';
import type { AdminUserRow } from '@/features/admin/types';
import type { AuthRoleSummary } from '@/features/auth/types';

interface UsersTableProps {
  rows: AdminUserRow[];
  /** The signed-in admin's own row can never be edited from the console. */
  currentUserId: string;
  onOpen: (userId: string) => void;
  availableRoles?: AuthRoleSummary[];
  onSetRoles?: (userId: string, roles: AuthRoleSummary[]) => Promise<void>;
  /** Phase 12: multi-select enables the bulk role toolbar. */
  selectedIds?: string[];
  onToggleSelect?: (userId: string) => void;
}

const COLUMNS = ['المستخدم', 'الأدوار', 'الحالة', 'الجلسات النشطة', 'تاريخ الانضمام', 'آخر ظهور'];

/** Users table: filters live in the toolbar, a row opens the detail panel, a checkbox feeds bulk actions. */
export const UsersTable: React.FC<UsersTableProps> = ({
  rows,
  currentUserId,
  onOpen,
  availableRoles = [],
  onSetRoles,
  selectedIds = [],
  onToggleSelect,
}) => (
  <div className="admin-table">
    <div className="admin-table-head" aria-hidden="true">
      <span>{""}</span>
      {COLUMNS.map((column) => (
        <span key={column}>{column}</span>
      ))}
    </div>

    {rows.map((row) => {
      const selected = selectedIds.includes(row.id);
      return (
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
          <div className="admin-cell admin-cell-select">
            <input
              type="checkbox"
              aria-label={`تحديد ${row.fullName}`}
              checked={selected}
              disabled={row.id === currentUserId || !onToggleSelect}
              onClick={(event) => event.stopPropagation()}
              onChange={() => onToggleSelect?.(row.id)}
            />
          </div>

          <div className="admin-cell admin-cell-user">
            <span className="admin-cell-label">المستخدم</span>
            <span className="admin-user">
              <UserAvatar src={row.avatarUrl} initials={initialsOf(row.fullName, row.email.slice(0, 1))} className="admin-user-avatar" />
              <span className="admin-user-text">
                <span className="admin-user-name">{row.fullName}</span>
                <span className="admin-user-email">{row.email}</span>
              </span>
            </span>
          </div>

          <div className="admin-cell">
            <span className="admin-cell-label">الأدوار</span>
            <RoleChips
              roles={row.roles ?? []}
              available={availableRoles.length ? availableRoles : (row.roles ?? [])}
              disabled={row.id === currentUserId}
              onChange={onSetRoles ? (roles) => onSetRoles(row.id, roles) : undefined}
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
      );
    })}
  </div>
);
