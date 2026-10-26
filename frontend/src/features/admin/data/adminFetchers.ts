/** Every call the admin console makes, each one matching an adminconsole route. */

import { apiGet, apiPost, apiPatch, apiDelete, buildQuery } from '@/shared/lib/apiClient';
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
  AdminUserInput,
  AdminUserRow,
  AdminVideoAsset,
  AdminVideoDiagnostics,
  AdminVideoInput,
  AdminVideoProvider,
  AdminContentSchema,
  AdminContentTypeKey,
  AdminContentPage,
  AdminContentRow,
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

export const createAdminUser = (input: AdminUserInput) =>
  apiPost<AdminUserRow>('/admin/users', input);

export const updateAdminUser = (userId: string, input: Partial<AdminUserInput>) =>
  apiPatch<AdminUserRow>(`/admin/users/${userId}`, input);

export const deleteAdminUser = (userId: string) =>
  apiDelete<{ deleted: boolean; id: string }>(`/admin/users/${userId}`);

export const fetchContentSchema = () => apiGet<AdminContentSchema>('/admin/content/schema');

export const fetchContent = (type: AdminContentTypeKey, params: { q?: string; page?: number } = {}) =>
  apiGet<AdminContentPage>(`/admin/content/${type}${buildQuery(params)}`);

export const createContent = (type: AdminContentTypeKey, values: Record<string, unknown>) =>
  apiPost<AdminContentRow>(`/admin/content/${type}`, values);

export const updateContent = (type: AdminContentTypeKey, id: string, values: Record<string, unknown>) =>
  apiPatch<AdminContentRow>(`/admin/content/${type}/${id}`, values);

export const deleteContent = (type: AdminContentTypeKey, id: string) =>
  apiDelete<{ deleted: boolean; id: string }>(`/admin/content/${type}/${id}`);

/** The video hosting reads — providers carry the select verdict, assets the health columns. */
export const fetchVideoProviders = async () =>
  (await apiGet<{ results: AdminVideoProvider[] }>('/admin/video-providers')).results;

export const fetchVideoAssets = async () =>
  (await apiGet<{ results: AdminVideoAsset[] }>('/admin/video-assets')).results;

/** The staged validation; `deep` also calls each provider's live API. */
export const fetchVideoDiagnostics = (deep: boolean) =>
  apiGet<AdminVideoDiagnostics>(`/admin/video-diagnostics${buildQuery({ deep: deep ? 'true' : undefined })}`);

/** Record an asset; the backend refuses an unavailable provider with its reason. */
export const createVideoAsset = (input: AdminVideoInput) => apiPost<AdminVideoAsset>('/admin/video-assets', input);

export const deleteVideoAsset = (id: string) => apiDelete<{ deleted: boolean; id: string }>(`/admin/video-assets/${id}`);
