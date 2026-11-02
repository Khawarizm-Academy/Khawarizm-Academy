import { apiDelete, apiGet, apiPatch, apiPost, apiPut, buildQuery } from '@/shared/lib/apiClient';
import { dataCacheManager } from '@/shared/lib/cacheManager';
import type { AdminRole, AuditPage, RoleCatalog, RoleCreateInput, RoleMembersPage } from '@/features/admin/types';

export const fetchRoleCatalog = () => apiGet<RoleCatalog>('/admin/roles/catalog');
export const fetchRoles = async () => (await apiGet<{ items: AdminRole[] }>('/admin/roles')).items;
export const fetchRole = (id: string) => apiGet<AdminRole>(`/admin/roles/${id}`);
export const createRole = async (input: RoleCreateInput) => {
  const result = await apiPost<AdminRole>('/admin/roles', input);
  dataCacheManager.invalidate('admin-roles');
  dataCacheManager.invalidate('auth');
  return result;
};
export const updateRole = async (id: string, input: Partial<RoleCreateInput> & { expectedUpdatedAt: string }) => {
  const result = await apiPatch<AdminRole>(`/admin/roles/${id}`, input);
  dataCacheManager.invalidate('admin-roles');
  dataCacheManager.invalidate('auth');
  return result;
};
export const deleteRole = async (id: string, reassignTo?: string) => {
  const result = await apiDelete<{ deleted: boolean }>(`/admin/roles/${id}${buildQuery({ reassignTo })}`);
  dataCacheManager.invalidate('admin-roles');
  dataCacheManager.invalidate('auth');
  return result;
};
export const reorderRoles = async (orderedIds: string[]) => {
  const result = await apiPost<{ items: AdminRole[] }>('/admin/roles/reorder', { orderedIds });
  dataCacheManager.invalidate('admin-roles');
  return result.items;
};
export const fetchRoleMembers = (roleId: string, params: { q?: string; page?: number } = {}) =>
  apiGet<RoleMembersPage>(`/admin/roles/${roleId}/members${buildQuery(params)}`);
export const addRoleMembers = (roleId: string, userIds: string[]) =>
  apiPost<{ results: Array<{ userId: string; ok: boolean; code?: string }> }>(`/admin/roles/${roleId}/members`, { userIds });
export const removeRoleMember = (roleId: string, userId: string) =>
  apiDelete<{ removed: boolean }>(`/admin/roles/${roleId}/members/${userId}`);
export const setUserRoles = (userId: string, roleIds: string[]) =>
  apiPut(`/admin/users/${userId}/roles`, { roleIds });
export const fetchAudit = (params: { action?: string; actor?: string; targetType?: string; targetId?: string; page?: number } = {}) =>
  apiGet<AuditPage>(`/admin/audit${buildQuery(params)}`);
