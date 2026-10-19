import React, { useCallback, useState } from 'react';
import { Monitor, Smartphone, Tablet, MonitorSmartphone, ShieldCheck, X, type LucideIcon } from 'lucide-react';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { useAuth } from '@/features/auth/context/authContext';
import { fetchSessions, revokeSession } from '@/features/auth/data/authFetchers';
import { DEVICE_LABELS } from '@/features/auth/types';
import type { AuthSession } from '@/features/auth/types';
import { SettingsCard } from '@/features/profile/components/cards/SettingsCard';

/** Device type -> its row icon, mirroring the API's `deviceType` codes. */
const DEVICE_ICONS: Record<string, LucideIcon> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: MonitorSmartphone,
};

/** Localized "last seen" stamp; blank when the API value is unparseable. */
function formatLastSeen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Every device this account signed in from, with a revoke action on the rest. */
export const ActiveSessionsCard: React.FC = () => {
  const { user } = useAuth();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // A visitor has no sessions list; the dashboard already gates this page.
  const { data, isLoading, refetch } = useCachedData<AuthSession[]>(['auth', 'sessions'], fetchSessions, {
    enabled: Boolean(user),
    initialData: [],
  });

  const revoke = useCallback(
    (sessionId: string) => {
      setRevokingId(sessionId);
      void revokeSession(sessionId)
        .then(() => refetch())
        .catch(() => undefined)
        .finally(() => setRevokingId(null));
    },
    [refetch]
  );

  return (
    <SettingsCard icon={ShieldCheck} title="الأجهزة والجلسات النشطة" iconClassName="text-blue-400" index={2}>
      {isLoading ? (
        <p className="profile-hint">جارٍ تحميل الأجهزة…</p>
      ) : data.length === 0 ? (
        <p className="profile-hint">لا توجد جلسات نشطة مسجّلة.</p>
      ) : (
        <div className="profile-devices">
          {data.map((session) => {
            const DeviceIcon = DEVICE_ICONS[session.deviceType] ?? MonitorSmartphone;
            const stateClass = session.isActive ? 'profile-device-live' : 'profile-device-dead';
            return (
              <div key={session.id} className={`profile-device ${stateClass}`}>
                <span
                  className={`profile-device-icon ${
                    session.isActive ? 'profile-device-icon-live' : 'profile-device-icon-dead'
                  }`}
                >
                  <DeviceIcon size={16} strokeWidth={2} />
                </span>

                <div className="profile-device-meta">
                  <span className="profile-device-label">
                    <span className="truncate">
                      {session.deviceLabel || DEVICE_LABELS[session.deviceType] || DEVICE_LABELS.unknown}
                    </span>
                    {session.isCurrent && <span className="profile-device-badge">هذا الجهاز</span>}
                  </span>
                  <span className="profile-device-time">
                    {[session.os, session.browser].filter(Boolean).join(' · ')}
                    {session.ipAddress && <span className="profile-device-ip"> · {session.ipAddress}</span>}
                  </span>
                  <span className="profile-device-time">{formatLastSeen(session.lastSeenAt)}</span>
                </div>

                {!session.isCurrent && session.isActive && (
                  <button
                    type="button"
                    onClick={() => revoke(session.id)}
                    disabled={revokingId === session.id}
                    title="إنهاء الجلسة"
                    className="profile-device-revoke"
                  >
                    <X size={13} strokeWidth={2.4} />
                    <span>إنهاء</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SettingsCard>
  );
};
