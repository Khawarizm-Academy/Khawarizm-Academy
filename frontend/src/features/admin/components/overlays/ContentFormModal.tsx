import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Save, X } from 'lucide-react';
import type { AdminContentRow, AdminContentType, AdminField } from '@/features/admin/types';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminFieldInput, type AdminFormValue } from '@/features/admin/components/controls/AdminFieldInput';
import {
  emptyFormValues,
  groupEditorFields,
  stepGuardError,
  toFormValues,
  toPayloadValues,
  FIELD_GROUP_ORDER,
  FIELD_GROUP_LABELS,
} from '@/features/admin/data/adminContentForm';
import { AdminStepsRail } from '@/features/admin/components/controls/AdminStepsRail';
import { fieldIcon } from '@/features/admin/data/fieldIcons';

interface ContentFormModalProps {
  contentType: AdminContentType;
  row: AdminContentRow | null;
  onClose: () => void;
}

/** One editor step: a stack of fields the operator fills before moving on. */
interface EditorStep {
  key: string;
  label: string;
  fields: AdminField[];
}

/** Create or edit a content row; the schema form walks its stacks as steps. */
export const ContentFormModal: React.FC<ContentFormModalProps> = ({ contentType, row, onClose }) => {
  const { createContent, updateContent } = useAdmin();
  const isEdit = row !== null;
  const stacks = groupEditorFields(contentType.fields);
  const steps: EditorStep[] = FIELD_GROUP_ORDER.flatMap((key) =>
    stacks[key].length > 0 ? [{ key, label: FIELD_GROUP_LABELS[key], fields: stacks[key] }] : []
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<Record<string, AdminFormValue>>(() =>
    row ? toFormValues(contentType.fields, row.values) : emptyFormValues(contentType.fields)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const ModeIcon = isEdit ? Pencil : Plus;
  const modeTitle = isEdit ? 'تعديل عنصر' : 'إضافة عنصر';
  const isLastStep = stepIndex === steps.length - 1;

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

  /** The next step only opens when the current one has no missing required field. */
  const goToNextStep = () => {
    const guard = stepGuardError(steps[stepIndex].fields, values);
    if (guard !== null) {
      setFormError(guard);
      return;
    }
    setFormError(null);
    setStepIndex(stepIndex + 1);
  };

  const goBackStep = () => {
    setFormError(null);
    setStepIndex(stepIndex - 1);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const guard = stepGuardError(steps[stepIndex].fields, values);
    if (guard !== null) {
      setFormError(guard);
      return;
    }
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

  const step = steps[stepIndex];
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
                {isEdit ? 'تُطبَّق التغييرات على الخادم فور الحفظ.' : 'امشِ في الخطوات واحدة واحدة ثم احفظ.'}
              </span>
            </span>
          </div>
          <button type="button" className="admin-icon-btn" aria-label="إغلاق" onClick={safeClose}>
            <X size={16} />
          </button>
        </div>

        <form className="admin-modal-body" onSubmit={handleSubmit}>
          {steps.length > 1 && <AdminStepsRail steps={steps} stepIndex={stepIndex} />}

          {/* One plate per step, rendered from the schema stack */}
          <section className="admin-form-section">
            <header className="admin-form-section-head">
              <span className="admin-form-section-icon">
                {React.createElement(fieldIcon(step.fields[0]), { size: 14 })}
              </span>
              <span className="admin-form-section-title">{step.label}</span>
              <span className="admin-form-section-count">{step.fields.length} حقول</span>
            </header>
            <div className="admin-form-grid">
              {step.fields.map((field) => (
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

          {formError && (
            <p className="admin-form-error justify-center" role="alert">
              {formError}
            </p>
          )}

          <div className="admin-form-footer-bar">
            <span className="admin-required-legend">
              {steps.length > 1 ? `خطوة ${stepIndex + 1} من ${steps.length}` : ''}
              {requiredCount > 0 ? `${steps.length > 1 ? ' · ' : ''}${requiredCount} حقول إلزامية معلَّمة بـ *` : ''}
            </span>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button type="button" className="admin-ghost-btn" disabled={isSubmitting} onClick={goBackStep}>
                  <ChevronRight size={15} />
                  <span>السابق</span>
                </button>
              )}
              {!isLastStep && (
                <button type="button" className="admin-primary-btn" disabled={isSubmitting} onClick={goToNextStep}>
                  <span>التالي</span>
                  <ChevronLeft size={15} />
                </button>
              )}
              {isLastStep && (
                <button type="submit" className="admin-primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{isEdit ? 'حفظ التغييرات' : 'إضافة العنصر'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

