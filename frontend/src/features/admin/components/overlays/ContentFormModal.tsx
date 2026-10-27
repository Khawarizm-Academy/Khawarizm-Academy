import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, NotebookPen, Pencil, Plus, Save, SlidersHorizontal, X } from 'lucide-react';
import type { AdminContentRow, AdminContentType } from '@/features/admin/types';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminFieldInput, type AdminFormValue } from '@/features/admin/components/controls/AdminFieldInput';
import {
  emptyFormValues,
  groupEditorFields,
  toFormValues,
  toPayloadValues,
  FIELD_GROUP_ORDER,
  FIELD_GROUP_LABELS,
} from '@/features/admin/data/adminContentForm';

interface ContentFormModalProps {
  contentType: AdminContentType;
  row: AdminContentRow | null;
  onClose: () => void;
}

/** One icon per editor stack; every schema form reads with the same grammar. */
const GROUP_ICONS: Record<string, React.ReactNode> = {
  required: <KeyRound size={14} />,
  prose: <NotebookPen size={14} />,
  structured: <SlidersHorizontal size={14} />,
};

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
  const modeTitle = isEdit ? 'تعديل العنصر' : 'إضافة عنصر';

  // Guard: a backdrop or Escape click must never discard typed work silently.
  const safeClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') safeClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [safeClose]);

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

  const groups = groupEditorFields(contentType.fields);
  const requiredCount = contentType.fields.filter((field) => field.required).length;

  return (
    <div className="admin-modal-overlay" onClick={safeClose}>
      <div
        className="admin-modal admin-modal-wide"
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
              <span className="admin-modal-sub">
                {isEdit ? 'تُطبَّق التغييرات على الخادم فور الحفظ.' : 'املأ البيانات الأساسية ثم احفظ.'}
              </span>
            </span>
          </div>
          <button type="button" className="admin-icon-btn" aria-label="إغلاق" onClick={safeClose}>
            <X size={16} />
          </button>
        </div>

        <form className="admin-modal-body" onSubmit={handleSubmit}>
          {/* One plate per stack, so every schema reads like a drafted paper */}
          {FIELD_GROUP_ORDER.map((groupKey) => {
            const stack = groups[groupKey];
            if (stack.length === 0) return null;
            return (
              <section key={groupKey} className="admin-form-section">
                <header className="admin-form-section-head">
                  <span className="admin-form-section-icon">{GROUP_ICONS[groupKey]}</span>
                  <span className="admin-form-section-title">{FIELD_GROUP_LABELS[groupKey]}</span>
                  <span className="admin-form-section-count">{stack.length} حقول</span>
                </header>
                <div className="admin-form-grid">
                  {stack.map((field) => (
                    <AdminFieldInput
                      key={field.name}
                      field={field}
                      value={values[field.name]}
                      disabled={isSubmitting}
                      onChange={(value) => setValues((prev) => ({ ...prev, [field.name]: value }))}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {formError && (
            <p className="admin-form-error justify-center" role="alert">
              {formError}
            </p>
          )}

          <div className="admin-form-footer-bar">
            <span className="admin-required-legend">
              {requiredCount > 0 ? `${requiredCount} حقول إلزامية معلَّمة بـ *` : 'لا توجد حقول إلزامية'}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" className="admin-ghost-btn" disabled={isSubmitting} onClick={safeClose}>
                إلغاء
              </button>
              <button type="submit" className="admin-primary-btn" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{isEdit ? 'حفظ التغييرات' : 'إضافة العنصر'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
