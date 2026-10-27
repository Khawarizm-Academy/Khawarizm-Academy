import React, { useEffect, useMemo, useState } from 'react';
import { Ban, Database, Loader2, RotateCcw, Save, ScrollText, ShieldAlert, UserCog, UserRound, X } from 'lucide-react';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { useAuth } from '@/features/auth/context/authContext';
import { useAdmin } from '@/features/admin/context/adminContext';
import { UserProfileCard } from '@/features/admin/components/cards/UserProfileCard';
import { SessionStatusBadge } from '@/features/admin/components/cards/Badges';
import { EventList } from '@/features/admin/components/layout/EventList';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { DEVICE_LABELS } from '@/features/admin/types';
import { formatLastSeen } from '@/features/admin/data/adminFormatters';
import { AdminFieldInput, type AdminFormValue } from '@/features/admin/components/controls/AdminFieldInput';
import { ConfirmAction } from '@/features/admin/components/controls/ConfirmAction';
import { toFormValues, toPayloadValues } from '@/features/admin/data/adminContentForm';
import type { AdminField, AdminUserInput } from '@/features/admin/types';

interface UserEditorProps {
  fields: AdminField[];
  profile: Record<string, unknown>;
  onSave: (input: Partial<AdminUserInput>) => Promise<boolean>;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * Editable account fields seeded from the profile; the panel remounts it per
 * account (key on parent) so values never leak between windows.
 */
const UserEditor: React.FC<UserEditorProps> = ({ fields, profile, onSave, onDirtyChange }) => {
  const [values, setValues] = useState<Record<string, AdminFormValue>>(() => toFormValues(fields, profile));
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const seeded = useMemo(() => toFormValues(fields, profile), [fields, profile]);
  const isDirty = fields.some((field) => values[field.name] !== seeded[field.name]);

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const restoreSaved = () => setValues(seeded);

  const handleSave = async () => {
    const { payload, error } = toPayloadValues(fields, values, false);
    if (error) {
      setFormError(error);
      return;
    }
    setIsSaving(true);
    const ok = await onSave(payload as Partial<AdminUserInput>);
    setIsSaving(false);
    if (ok) setFormError(null);
  };

  return (
    <>
      <div className="admin-form-grid">
        {fields.map((field) => (
          <AdminFieldInput
            key={field.name}
            field={field}
            value={values[field.name]}
            disabled={isSaving}
            readOnly={field.readonly}
            onChange={(value) => setValues((prev) => ({ ...prev, [field.name]: value }))}
          />
        ))}
      </div>
      {formError && (
        <p className="admin-form-error justify-center" role="alert">
          {formError}
        </p>
      )}
      <div className="admin-form-footer">
        <span className={`admin-dirty-chip ${isDirty ? 'admin-dirty-chip-on' : 'admin-dirty-chip-off'}`}>
          {isDirty ? 'تغييرات غير محفوظة' : 'لا تغييرات'}
        </span>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button type="button" className="admin-ghost-btn" onClick={restoreSaved} disabled={isSaving}>
              <RotateCcw size={14} />
              <span>استعادة المحفوظ</span>
            </button>
          )}
          <button type="button" className="admin-primary-btn" disabled={isSaving || !isDirty} onClick={handleSave}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{isSaving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </div>
    </>
  );
};

/** One account's profile, edit form, devices, and audit trail, opened from the table. */
export const UserDetailPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const {
    selectedUserId,
    selectedUser,
    selectedUserError,
    selectUser,
    revokingSessionId,
    revokeSession,
    refresh,
    contentSchema,
    updateUser,
    deleteUser,
    deletingUserId,
  } = useAdmin();
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);

  const fields = useMemo(() => contentSchema?.userFields ?? [], [contentSchema]);

  // Escape mirrors the backdrop: an edited window asks before it discards.
  useEffect(() => {
    if (selectedUserId === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isEditorDirty) {
        setIsConfirmingClose(true);
        return;
      }
      selectUser(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedUserId, isEditorDirty, selectUser]);

  if (selectedUserId === null) return null;

  const detail = selectedUser;
  const close = () => selectUser(null);
  const requestClose = () => (isEditorDirty ? setIsConfirmingClose(true) : close());

  const handleSave = (input: Partial<AdminUserInput>) => updateUser(selectedUserId, input);

  const handleDelete = async () => {
    if (!detail) return;
    const ok = await deleteUser(detail.profile.id);
    if (ok) selectUser(null);
  };

  return (
    <div className="admin-modal-overlay" onClick={isConfirmingClose ? undefined : requestClose}>
      <div
        className="admin-modal admin-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-head">
          <div className="admin-modal-lead">
            <span className="admin-modal-icon">
              <UserRound size={17} />
            </span>
            <span className="admin-modal-text">
              <span id="admin-detail-title" className="admin-modal-title">
                {detail?.profile.fullName ?? 'تفاصيل الحساب'}
              </span>
              <span className="admin-modal-sub">{detail?.profile.email ?? 'جارٍ تحميل التفاصيل…'}</span>
            </span>
          </div>
          <button type="button" className="admin-icon-btn" aria-label="إغلاق" onClick={requestClose}>
            <X size={16} />
          </button>
        </div>

        {/* The discard guard sheet: it only exists while unsaved edits linger */}
        {isConfirmingClose && (
          <div className="admin-close-guard" role="alertdialog" aria-label="تغييرات غير محفوظة">
            <ShieldAlert size={16} className="shrink-0 text-gold-400" />
            <span className="flex-1 text-xs font-body text-slate-200 text-right">
              التغييرات على بيانات هذا الحساب لم تُحفظ بعد.
            </span>
            <button type="button" className="admin-ghost-btn" onClick={() => setIsConfirmingClose(false)}>
              متابعة التعديل
            </button>
            <button type="button" className="admin-danger-btn" onClick={close}>
              تجاهل التغييرات
            </button>
          </div>
        )}

        <div className="admin-modal-body">
          {!detail ? (
            selectedUserError ? (
              <AdminEmptyState title="تعذّر تحميل بيانات الحساب" isError onRetry={refresh} />
            ) : (
              <DataSectionSkeleton variant="list" count={3} />
            )
          ) : (
            <>
              <UserProfileCard profile={detail.profile} />

              <section className="admin-detail-section">
                <h3 className="admin-detail-section-title">
                  <UserCog size={14} />
                  <span>تعديل بيانات الحساب</span>
                </h3>
                {fields.length === 0 ? (
                  <DataSectionSkeleton variant="list" count={2} />
                ) : (
                  <UserEditor
                    key={detail.profile.id}
                    fields={fields}
                    profile={detail.profile as unknown as Record<string, unknown>}
                    onSave={handleSave}
                    onDirtyChange={setIsEditorDirty}
                  />
                )}
              </section>

              <section className="admin-detail-section">
                <h3 className="admin-detail-section-title admin-detail-title-danger">
                  <ShieldAlert size={14} />
                  <span>حذف الحساب</span>
                </h3>
                <p className="admin-detail-empty">
                  الحذف نهائي ولا يمكن التراجع عنه؛ يختفي الحساب وجميع أجهزته المسجّلة فورًا.
                </p>
                <div>
                  <ConfirmAction
                    label="حذف الحساب"
                    confirmLabel="نعم، احذف الحساب"
                    icon={Ban}
                    busy={deletingUserId === detail.profile.id}
                    disabled={detail.profile.id === currentUser?.id}
                    onConfirm={handleDelete}
                  />
                </div>
                {detail.profile.id === currentUser?.id && (
                  <p className="admin-detail-empty">لا يمكن حذف الحساب الذي تسجّل الدخول به حاليًا.</p>
                )}
              </section>

              <section className="admin-detail-section">
                <h3 className="admin-detail-section-title">
                  <Database size={14} />
                  <span>الأجهزة والجلسات</span>
                </h3>
                {detail.sessions.length === 0 ? (
                  <p className="admin-detail-empty">لا توجد أجهزة مسجّلة لهذا الحساب.</p>
                ) : (
                  <div className="admin-mini-list">
                    {detail.sessions.map((session) => {
                      const isRevoking = revokingSessionId === session.id;
                      return (
                        <div key={session.id} className="admin-mini-row">
                          <span className="admin-mini-main">
                            <span className="admin-mini-title">
                              {DEVICE_LABELS[session.deviceType] ?? session.deviceType} · {session.os}
                            </span>
                            <span className="admin-mini-meta">
                              {session.browser} · {session.ipAddress || 'غير معروف'} · {formatLastSeen(session.lastSeenAt)}
                            </span>
                          </span>
                          <span className="admin-mini-actions">
                            <SessionStatusBadge session={session} />
                            <button
                              type="button"
                              className="admin-revoke-btn"
                              disabled={!session.isActive || session.isCurrent || isRevoking}
                              title={session.isCurrent ? 'هذا الجهاز الذي تستخدمه الآن' : 'إنهاء الجلسة'}
                              onClick={() => revokeSession(session.id)}
                            >
                              {isRevoking ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                              <span>{isRevoking ? 'جارٍ الإنهاء…' : 'إنهاء الجلسة'}</span>
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="admin-detail-section">
                <h3 className="admin-detail-section-title">
                  <ScrollText size={14} />
                  <span>سجل النشاط</span>
                </h3>
                {detail.events.length === 0 ? (
                  <p className="admin-detail-empty">لا توجد أحداث مسجّلة لهذا الحساب.</p>
                ) : (
                  <EventList events={detail.events} />
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
