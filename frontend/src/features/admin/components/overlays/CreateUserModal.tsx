import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, UserPlus, X } from 'lucide-react';
import { useAdmin } from '@/features/admin/context/adminContext';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { AdminFieldInput, type AdminFormValue } from '@/features/admin/components/controls/AdminFieldInput';
import { emptyFormValues, toPayloadValues } from '@/features/admin/data/adminContentForm';
import type { AdminUserInput } from '@/features/admin/types';

interface CreateUserModalProps {
  onClose: () => void;
}

/** Create a new account: renders user fields from schema plus a password field. */
export const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose }) => {
  const { contentSchema, createUser } = useAdmin();
  const fields = useMemo(() => contentSchema?.userFields ?? [], [contentSchema]);
  // A new account starts active; edits overlay the schema-derived base so no seed effect is needed.
  const baseValues = useMemo(() => {
    const seed = emptyFormValues(fields);
    seed['isActive'] = true;
    return seed;
  }, [fields]);
  const [edits, setEdits] = useState<Record<string, AdminFormValue>>({});
  const values = { ...baseValues, ...edits };
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const { payload, error } = toPayloadValues(fields, values, true);
    if (error) {
      setFormError(error);
      return;
    }
    const passwordTrimmed = password.trim();
    if (passwordTrimmed.length === 0) {
      setFormError('كلمة المرور مطلوبة عند إنشاء مستخدم جديد.');
      return;
    }
    const input: AdminUserInput = {
      ...payload,
      email: String(payload['email'] ?? values['email'] ?? '').toString().trim().toLowerCase(),
      password: passwordTrimmed,
    } as AdminUserInput;
    setIsSubmitting(true);
    const ok = await createUser(input);
    setIsSubmitting(false);
    if (ok) {
      setFormError(null);
      onClose();
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal admin-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-create-user-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-head">
          <div className="admin-modal-lead">
            <span className="admin-modal-icon">
              <UserPlus size={17} />
            </span>
            <span className="admin-modal-text">
              <span id="admin-create-user-title" className="admin-modal-title">
                مستخدم جديد
              </span>
              <span className="admin-modal-sub">املأ الحقول ثم احفظ</span>
            </span>
          </div>
          <button type="button" className="admin-icon-btn" aria-label="إغلاق" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form className="admin-modal-body" onSubmit={handleSubmit}>
          {fields.length === 0 ? (
            <DataSectionSkeleton variant="list" count={3} />
          ) : (
            <>
              <div className="admin-form-grid">
                {fields.map((field) => (
                  <AdminFieldInput
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    disabled={isSubmitting}
                    onChange={(value) => setEdits((prev) => ({ ...prev, [field.name]: value }))}
                  />
                ))}
                <div className="admin-field admin-field-wide">
                  <label className="admin-field-label" htmlFor="admin-create-password">
                    كلمة المرور
                    <span className="admin-required" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="admin-create-password"
                    type="password"
                    dir="ltr"
                    className="admin-input"
                    value={password}
                    disabled={isSubmitting}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="أدخل كلمة المرور"
                  />
                </div>
              </div>
            </>
          )}
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
              <span>إضافة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
