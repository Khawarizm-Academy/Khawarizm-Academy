import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import type { AdminContentRow, AdminContentType } from '@/features/admin/types';
import { ConfirmAction } from '@/features/admin/components/controls/ConfirmAction';

interface ContentTableProps {
  rows: AdminContentRow[];
  contentType: AdminContentType;
  deletingId: string | null;
  onEdit: (row: AdminContentRow) => void;
  onDelete: (id: string) => void;
}

/** Paged table of content rows (key + title) with edit/delete actions. */
export const ContentTable: React.FC<ContentTableProps> = ({
  rows,
  contentType,
  deletingId,
  onEdit,
  onDelete,
}) => (
  <div className="admin-table admin-table-content">
    <div className="admin-table-head" aria-hidden="true">
      <span>{contentType.keyField}</span>
      <span>{contentType.titleField}</span>
      <span>إجراءات</span>
    </div>

    {rows.map((row) => (
      <div key={row.id} className="admin-table-row admin-table-row-static">
        <div className="admin-cell">
          <span className="admin-cell-label">{contentType.keyField}</span>
          <span className="admin-cell-value admin-mono admin-key">{row.key}</span>
        </div>

        <div className="admin-cell">
          <span className="admin-cell-label">{contentType.titleField}</span>
          <span className="admin-cell-value admin-content-title">{row.title}</span>
        </div>

        <div className="admin-cell">
          <span className="admin-cell-label">إجراءات</span>
          <span className="admin-actions">
            <button type="button" className="admin-icon-btn" aria-label="تعديل" onClick={() => onEdit(row)}>
              <Edit size={14} />
            </button>
            <ConfirmAction
              label=""
              confirmLabel="نعم، احذف"
              icon={Trash2}
              busy={deletingId === row.id}
              onConfirm={() => onDelete(row.id)}
            />
          </span>
        </div>
      </div>
    ))}
  </div>
);
