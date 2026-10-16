import React from 'react';
import { EVENT_KIND_LABELS, ROLE_LABELS, type AdminEventKind } from '@/features/admin/types';
import type { AuthRole } from '@/features/auth/types';

// One tone per role / event kind — a lookup, so a new value fails loudly in the map.
const ROLE_TONE: Record<AuthRole, string> = {
  student: 'admin-badge-student',
  instructor: 'admin-badge-instructor',
  admin: 'admin-badge-admin',
};

const KIND_TONE: Record<AdminEventKind, string> = {
  login: 'admin-badge-login',
  logout: 'admin-badge-logout',
  refresh: 'admin-badge-refresh',
  revoked: 'admin-badge-revoked',
  rejected: 'admin-badge-rejected',
};

type SessionStatus = 'current' | 'live' | 'ended';

const STATUS_TONE: Record<SessionStatus, string> = {
  current: 'admin-badge-current',
  live: 'admin-badge-active',
  ended: 'admin-badge-inactive',
};

const STATUS_LABEL: Record<SessionStatus, string> = {
  current: 'هذا الجهاز',
  live: 'نشطة',
  ended: 'منتهية',
};

/** The current device wins over "active"; an inactive row is ended either way. */
const statusOf = (session: { isActive: boolean; isCurrent: boolean }): SessionStatus =>
  session.isCurrent ? 'current' : session.isActive ? 'live' : 'ended';

/** The reader's role, in the auth feature's Arabic wording. */
export const RoleBadge: React.FC<{ role: AuthRole }> = ({ role }) => (
  <span className={`admin-badge ${ROLE_TONE[role]}`}>{ROLE_LABELS[role]}</span>
);

/** One audit kind, coloured so rejected rows stand out in the feed. */
export const EventKindBadge: React.FC<{ kind: AdminEventKind }> = ({ kind }) => (
  <span className={`admin-badge ${KIND_TONE[kind]}`}>{EVENT_KIND_LABELS[kind]}</span>
);

/** Whether a device row is the reader's own, still live, or already ended. */
export const SessionStatusBadge: React.FC<{ session: { isActive: boolean; isCurrent: boolean } }> = ({ session }) => {
  const status = statusOf(session);
  return <span className={`admin-badge ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>;
};

/** Whether an account can still sign in. */
export const ActiveBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <span className={`admin-badge ${isActive ? 'admin-badge-active' : 'admin-badge-inactive'}`}>
    {isActive ? 'مفعّل' : 'معطّل'}
  </span>
);
