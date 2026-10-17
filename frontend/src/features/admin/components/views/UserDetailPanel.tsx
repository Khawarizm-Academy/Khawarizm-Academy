import React, { useEffect } from 'react';
import { Ban, Loader2, UserRound, X } from 'lucide-react';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { useAdmin } from '@/features/admin/context/adminContext';
import { UserProfileCard } from '@/features/admin/components/cards/UserProfileCard';
import { SessionStatusBadge } from '@/features/admin/components/cards/Badges';
import { EventList } from '@/features/admin/components/layout/EventList';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { DEVICE_LABELS } from '@/features/admin/types';
import { formatLastSeen } from '@/features/admin/data/adminFormatters';

/** One account's profile, devices, and audit trail, opened from the users table. */
export const UserDetailPanel: React.FC = () => {
  const {
    selectedUserId,
    selectedUser,
    selectedUserError,
    selectUser,
    revokingSessionId,
    revokeSession,
    refresh,
  } = useAdmin();

  // Escape mirrors the backdrop: both close the panel through one action.
  useEffect(() => {
    if (selectedUserId === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') selectUser(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedUserId, selectUser]);

  if (selectedUserId === null) return null;

  const close = () => selectUser(null);
  const detail = selectedUser;

  return (
    <div className="admin-modal-overlay" onClick={close}>
      <div
        className="admin-modal"
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
                {detail?.profile.fullName ?? 'تفاصيل المستخدم'}
              </span>
              <span className="admin-modal-sub">{detail?.profile.email ?? 'جارٍ التحميل…'}</span>
            </span>
          </div>
          <button type="button" className="admin-icon-btn" aria-label="إغلاق" onClick={close}>
            <X size={16} />
          </button>
        </div>

        <div className="admin-modal-body">
          {!detail ? (
            selectedUserError ? (
              <AdminEmptyState title="تعذّر تحميل بيانات المستخدم" isError onRetry={refresh} />
            ) : (
              <DataSectionSkeleton variant="list" count={3} />
            )
          ) : (
            <>
              <UserProfileCard profile={detail.profile} />

              <section className="admin-detail-section">
                <h3 className="admin-detail-section-title">الأجهزة والجلسات</h3>
                {detail.sessions.length === 0 ? (
                  <p className="admin-detail-empty">لا توجد جلسات مسجّلة لهذا الحساب.</p>
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
                              {session.browser} · {session.ipAddress || '—'} · {formatLastSeen(session.lastSeenAt)}
                            </span>
                          </span>
                          <span className="admin-mini-actions">
                            <SessionStatusBadge session={session} />
                            <button
                              type="button"
                              className="admin-revoke-btn"
                              disabled={!session.isActive || session.isCurrent || isRevoking}
                              title={session.isCurrent ? 'هذه جلستك الحالية' : 'إنهاء الجلسة'}
                              onClick={() => revokeSession(session.id)}
                            >
                              {isRevoking ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                              <span>{isRevoking ? 'جارٍ الإنهاء' : 'إنهاء'}</span>
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="admin-detail-section">
                <h3 className="admin-detail-section-title">سجل النشاط</h3>
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
