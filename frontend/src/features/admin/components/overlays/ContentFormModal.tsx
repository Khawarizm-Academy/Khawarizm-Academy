import React, { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Save, X } from 'lucide-react';
import type { AdminContentRow, AdminContentType } from '@/features/admin/types';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminFieldInput, type AdminFormValue } from '@/features/admin/components/controls/AdminFieldInput';
import { emptyFormValues, toFormValues, toPayloadValues } from '@/features/admin/data/adminContentForm';

interface ContentFormModalProps {
  contentType: AdminContentType;
  row: AdminContentRow | null;
  onClose: () => void;
}

/** Create or edit a content row; the form is rendered from the schema. */
export const ContentFormModal: React.FC<ContentFormModalProps> = ({ contentType, row, onClose }) => {
  const { createContent, updateContent } = useAdmin();
  const isEdit = row !== null;
  const [values, setValues] = useState<Record<string, AdminFormValue>>(() =>
    row ? toFormValues(contentType.fields, row.values) : emptyFormValues(contentType.fields)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const ModeIcon = isEdit ? Pencil : Plus;
  const modeTitle = isEdit ? 'تعديل عنصر' : 'إضافة عنصر';

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const { payload, error } = toPayloadValues(contentType.fields, values, !isEdit);
    if (error) {
      setFormError(error);
      return;
    }
    setIsSubmitting(true);
    const ok = isEdit ? await updateContent(row.id, payload) : await createContent(payload);
    setIsSubmitting(false);
    if (ok) {
      setFormError(null);
      onClose();
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-content-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-head">
          <div className="admin-modal-lead">
            <span className="admin-modal-icon">
              <ModeIcon size={17} />
            </span>
            <span className="admin-modal-text">
              <span id="admin-content-form-title" className="admin-modal-title">
                {modeTitle} · {contentType.label}
              </span>
              <span className="admin-modal-sub">{isEdit ? row.key : 'املأ الحقول ثم احفظ'}</span>
            </span>
          </div>
          <button type="button" className="admin-icon-btn" aria-label="إغلاق" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form className="admin-modal-body" onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            {contentType.fields.map((field) => (
              <AdminFieldInput
                key={field.name}
                field={field}
                value={values[field.name]}
                disabled={isSubmitting}
                onChange={(value) => setValues((prev) => ({ ...prev, [field.name]: value }))}
              />
            ))}
          </div>
          {formError && (
            <p className="admin-form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="admin-form-footer">
            <button type="button" className="admin-ghost-btn" disabled={isSubmitting} onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="admin-primary-btn" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isEdit ? 'حفظ' : 'إضافة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
