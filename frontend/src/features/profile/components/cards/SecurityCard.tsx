import React, { useCallback, useEffect, useState } from 'react';
import { Monitor, RefreshCw, ShieldOff, Smartphone, Tablet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ApiError } from '@/shared/lib/apiClient';
import { fetchSessions, revokeSession } from '@/features/auth/data/authFetchers';
import { DEVICE_LABELS, type AuthSession } from '@/features/auth/types';
import { SettingsCard } from '@/features/profile/components/cards/SettingsCard';

/** Device icon per type — one lookup instead of a branch chain. */
const DEVICE_ICONS: Record<string, LucideIcon> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Smartphone,
};

/** One label per revoked reason, so an inactive session still explains itself. */
const REVOKED_LABELS: Record<string, string> = {
  signed_in_elsewhere: 'انتهت بعد الدخول من جهاز آخر',
  expired: 'انتهت الصلاحية',
  revoked: 'انتهت الجلسة',
  revoked_by_admin: 'أنهيها مسؤول',
  logout: 'تم تسجيل الخروج',
};

/** Gregorian Arabic timestamp (ar-SA would switch to the Islamic calendar). */
const formatWhen = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/**
 * Device footprint: every session this account signed in from, with single-device
 * state (revoking one logs that device out; this device shows a badge instead).
 */
export const SecurityCard: React.FC = () => {
  const [sessions, setSessions] = useState<AuthSession[] | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return fetchSessions()
      .then(setSessions)
      .catch(() => {
        setSessions([]);
        setError('تعذر تحميل قائمة الأجهزة.');
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    setError(null);
    try {
      await revokeSession(sessionId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر إنهاء الجلسة.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <SettingsCard icon={Smartphone} title="الأجهزة والجلسات" iconClassName="text-gold-400" index={5}>
      <p className="profile-hint">
        يُسمح بجلسة واحدة نشطة؛ الدخول من جهاز آخر ينهي جلستك السابقة تلقائيًا.
      </p>

      {sessions === null && <div className="skeleton-card h-24 mt-2" aria-hidden="true" />}

      {sessions && sessions.length === 0 && (
        <p className="profile-hint">لا توجد جلسات مسجّلة على هذا الحساب بعد.</p>
      )}

      {sessions && sessions.length > 0 && (
        <div className="profile-devices">
          {sessions.map((session) => {
            const Icon = DEVICE_ICONS[session.deviceType] ?? DEVICE_ICONS.unknown;
            const revokedLabel = REVOKED_LABELS[session.revokedReason];

            return (
              <div key={session.id} className={`profile-device ${session.isActive ? 'profile-device-live' : 'profile-device-dead'}`}>
                <span className={`profile-device-icon ${session.isActive ? 'profile-device-icon-live' : 'profile-device-icon-dead'}`}>
                  <Icon size={17} strokeWidth={2} />
                </span>

                <div className="profile-device-meta">
                  <span className="profile-device-label">
                    {DEVICE_LABELS[session.deviceType] ?? DEVICE_LABELS.unknown}
                    <span className="profile-device-os"> · {session.os} / {session.browser}</span>
                    {session.isCurrent && <span className="profile-device-badge">هذا الجهاز</span>}
                  </span>
                  <span className="profile-device-time">
                    {session.isActive ? 'آخر نشاط: ' : revokedLabel ? `${revokedLabel} · ` : 'موقوفة · '}
                    {formatWhen(session.lastSeenAt)}
                    {session.ipAddress && <span className="profile-device-ip"> · IP {session.ipAddress}</span>}
                  </span>
                </div>

                {session.isActive && !session.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokingId === session.id}
                    className="profile-device-revoke"
                    title="تسجيل الخروج من هذا الجهاز"
                  >
                    {revokingId === session.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <ShieldOff size={14} />
                    )}
                    <span>إنهاء</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="profile-hint profile-hint-error">{error}</p>}
    </SettingsCard>
  );
};
