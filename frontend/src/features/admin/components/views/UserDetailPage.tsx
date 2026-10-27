import React, { useEffect, useMemo, useState } from 'react';
import { Ban, ChevronRight, Database, Loader2, RotateCcw, Save, ScrollText, ShieldAlert, UserCog } from 'lucide-react';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { UserAvatar } from '@/shared/components/Artwork/UserAvatar';
import { useAuth } from '@/features/auth/context/authContext';
import { useAdmin } from '@/features/admin/context/adminContext';
import { ActiveBadge, RoleBadge, SessionStatusBadge } from '@/features/admin/components/cards/Badges';
import { EventList } from '@/features/admin/components/layout/EventList';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { DEVICE_LABELS } from '@/features/admin/types';
import { formatDateTime, formatLastSeen, initialsOf } from '@/features/admin/data/adminFormatters';
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
 * Editable account fields seeded from the profile; the page remounts it per
 * account (key on parent) so values never leak between visits.
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

/**
 * The full account page the users table opens: identity, raw fields, editor,
 * devices, audit trail, and the delete zone — everything in one place.
 */
export const UserDetailPage: React.FC = () => {
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

  // Escape mirrors the back button: an edited page asks before it discards.
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
  const goBack = () => selectUser(null);
  const requestBack = () => (isEditorDirty ? setIsConfirmingClose(true) : goBack());

  // The email already lives in the hero, so the raw grid skips it.
  const identityFields = (profile: NonNullable<typeof detail>['profile']): Array<{ label: string; value: string }> => [
    { label: 'رقم الهاتف', value: profile.phone || '—' },
    { label: 'حالة العضوية', value: profile.membershipStatus || '—' },
    { label: 'معرّف الحساب', value: profile.id },
    { label: 'تاريخ الانضمام', value: formatDateTime(profile.createdAt) },
    { label: 'آخر ظهور', value: formatLastSeen(profile.lastSeenAt) },
  ];

  if (!detail) {
    return (
      <div className="admin-detail-page">
        <button type="button" className="admin-ghost-btn" onClick={goBack}>
          <ChevronRight size={15} />
          <span>العودة إلى الحسابات</span>
        </button>
        {selectedUserError ? (
          <AdminEmptyState title="تعذّر تحميل بيانات الحساب" isError onRetry={refresh} />
        ) : (
          <DataSectionSkeleton variant="list" count={4} />
        )}
      </div>
    );
  }

  const profile = detail.profile;

  const handleSave = (input: Partial<AdminUserInput>) => updateUser(selectedUserId, input);

  const handleDelete = async () => {
    const ok = await deleteUser(profile.id);
    if (ok) goBack();
  };

  return (
    <div className="admin-detail-page">
      <button type="button" className="admin-ghost-btn self-start" onClick={requestBack}>
        <ChevronRight size={15} />
        <span>العودة إلى الحسابات</span>
      </button>

      {/* The discard guard: it only appears while unsaved edits linger */}
      {isConfirmingClose && (
        <div className="admin-detail-guard" role="alertdialog" aria-label="تغييرات غير محفوظة">
          <ShieldAlert size={16} className="shrink-0 text-gold-400" />
          <span className="flex-1 text-xs font-body text-slate-200 text-right">
            التغييرات على بيانات هذا الحساب لم تُحفظ بعد.
          </span>
          <button type="button" className="admin-ghost-btn" onClick={() => setIsConfirmingClose(false)}>
            متابعة التعديل
          </button>
          <button type="button" className="admin-danger-btn" onClick={goBack}>
            تجاهل التغييرات
          </button>
        </div>
      )}

      {/* Identity hero: who this page belongs to, always on record */}
      <section className="admin-detail-hero animate-fade-in-up">
        <UserAvatar
          src={profile.avatarUrl}
          initials={initialsOf(profile.fullName, profile.avatarInitials)}
          className="admin-detail-hero-avatar"
        />
        <div className="admin-detail-hero-names">
          <h3 className="admin-detail-hero-name">{profile.fullName}</h3>
          <span className="admin-detail-hero-email" dir="auto">
            {profile.email}
          </span>
          <span className="admin-detail-hero-meta">
            <RoleBadge role={profile.role} />
            <ActiveBadge isActive={profile.isActive} />
            <span className="admin-detail-hero-sub">آخر ظهور {formatLastSeen(profile.lastSeenAt)}</span>
          </span>
        </div>
      </section>

      {/* Raw record beside the destructive zone: read-only facts never move */}
      <div className="admin-detail-toprow animate-fade-in-up animation-delay-100">
        <section className="admin-detail-section">
          <h3 className="admin-detail-section-title">
            <Database size={14} />
            <span>بطاقة الحساب</span>
          </h3>
          <div className="admin-detail-grid">
            {identityFields(profile).map((field) => (
              <div key={field.label} className="admin-detail-field">
                <span className="admin-detail-field-label">{field.label}</span>
                <span className="admin-detail-field-value" dir={field.label === 'معرّف الحساب' ? 'ltr' : undefined}>
                  {field.value}
                </span>
              </div>
            ))}
          </div>
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
              busy={deletingUserId === profile.id}
              disabled={profile.id === currentUser?.id}
              onConfirm={handleDelete}
            />
          </div>
          {profile.id === currentUser?.id && (
            <p className="admin-detail-empty">لا يمكن حذف الحساب الذي تسجّل الدخول به حاليًا.</p>
          )}
        </section>
      </div>

      <section className="admin-detail-section animate-fade-in-up animation-delay-150">
        <h3 className="admin-detail-section-title">
          <UserCog size={14} />
          <span>تعديل بيانات الحساب</span>
        </h3>
        {fields.length === 0 ? (
          <DataSectionSkeleton variant="list" count={2} />
        ) : (
          <UserEditor
            key={profile.id}
            fields={fields}
            profile={profile as unknown as Record<string, unknown>}
            onSave={handleSave}
            onDirtyChange={setIsEditorDirty}
          />
        )}
      </section>

      <section className="admin-detail-section animate-fade-in-up animation-delay-200">
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

      <section className="admin-detail-section animate-fade-in-up animation-delay-300">
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
    </div>
  );
};
