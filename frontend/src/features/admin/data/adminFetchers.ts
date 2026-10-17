/** Every call the admin console makes, each one matching an adminconsole route. */

import { apiGet, apiPost, buildQuery } from '@/shared/lib/apiClient';
import type { AuthRole, AuthUser } from '@/features/auth/types';
import type {
  AdminActiveFilter,
  AdminEvent,
  AdminEventKind,
  AdminLoginRange,
  AdminOverview,
  AdminRoleFilter,
  AdminSessionWithUser,
  AdminUserDetail,
  AdminUserRow,
  DeviceBreakdown,
  LoginSeries,
  Paged,
} from '@/features/admin/types';

export const fetchOverview = () => apiGet<AdminOverview>('/admin/overview');

/** `role` is sent only when it narrows the list; `all` is skipped by buildQuery. */
export const fetchUsers = (params: { q?: string; role?: AdminRoleFilter; page?: number } = {}) =>
  apiGet<Paged<AdminUserRow>>(`/admin/users${buildQuery(params)}`);

export const fetchUserDetail = (userId: string) => apiGet<AdminUserDetail>(`/admin/users/${userId}`);

/** The API speaks `active=true|false`; `all` and "unset" mean "no filter". */
const ACTIVE_FLAG: Record<AdminActiveFilter, string | undefined> = {
  all: undefined,
  active: 'true',
  inactive: 'false',
};

export const fetchSessions = (params: { q?: string; active?: AdminActiveFilter; page?: number } = {}) =>
  apiGet<Paged<AdminSessionWithUser>>(
    `/admin/sessions${buildQuery({ ...params, active: ACTIVE_FLAG[params.active ?? 'all'] })}`
  );

export const fetchLoginSeries = (range: AdminLoginRange) =>
  apiGet<LoginSeries>(`/admin/analytics/logins${buildQuery({ days: range })}`);

export const fetchDeviceBreakdown = () => apiGet<DeviceBreakdown>('/admin/analytics/devices');

export const fetchEvents = async (kind: AdminEventKind | 'all') =>
  (await apiGet<{ results: AdminEvent[] }>(`/admin/events${buildQuery({ kind })}`)).results;

/** Promote or demote; the backend refuses a self-change. */
export const updateUserRole = (userId: string, role: AuthRole) =>
  apiPost<AuthUser>(`/admin/users/${userId}/role`, { role });

/** Force-logout one device anywhere in the fleet. */
export const revokeAdminSession = (sessionId: string) =>
  apiPost<AdminSessionWithUser>(`/admin/sessions/${sessionId}/revoke`);
