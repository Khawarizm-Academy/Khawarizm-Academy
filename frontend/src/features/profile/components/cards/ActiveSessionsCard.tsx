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

/** One signed-in device the reader can force out. */
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
    <SettingsCard icon={ShieldCheck} title="الأجهزة والجلسات النشطة" iconClassName="text-blue-400" index={5}>
      {isLoading ? (
        <p className="profile-session-empty">جارٍ تحميل الأجهزة…</p>
      ) : data.length === 0 ? (
        <p className="profile-session-empty">لا توجد جلسات نشطة مسجّلة.</p>
      ) : (
        <div className="profile-sessions">
          {data.map((session) => {
            const DeviceIcon = DEVICE_ICONS[session.deviceType] ?? MonitorSmartphone;
            return (
              <div key={session.id} className="profile-session">
                <span className="profile-session-icon">
                  <DeviceIcon size={16} strokeWidth={2} />
                </span>

                <div className="profile-session-info">
                  <span className="profile-session-name">
                    {session.deviceLabel || DEVICE_LABELS[session.deviceType] || DEVICE_LABELS.unknown}
                    {session.isCurrent && <span className="profile-session-current">هذا الجهاز</span>}
                  </span>
                  <span className="profile-session-meta">
                    {[session.os, session.browser, session.ipAddress].filter(Boolean).join(' · ')}
                  </span>
                  <span className="profile-session-time">{formatLastSeen(session.lastSeenAt)}</span>
                </div>

                {!session.isCurrent && session.isActive && (
                  <button
                    type="button"
                    onClick={() => revoke(session.id)}
                    disabled={revokingId === session.id}
                    title="إنهاء الجلسة"
                    className="profile-session-revoke"
                  >
                    <X size={14} strokeWidth={2.4} />
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
