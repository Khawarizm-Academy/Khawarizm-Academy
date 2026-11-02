import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addRoleMembers,
  createRole,
  deleteRole,
  fetchAudit,
  fetchRole,
  fetchRoleCatalog,
  fetchRoleMembers,
  fetchRoles,
  removeRoleMember,
  reorderRoles,
  setUserRoles,
  updateRole,
} from '@/features/admin/data/roleFetchers';
import { dataCacheManager } from '@/shared/lib/cacheManager';

const API_BASE = 'http://localhost:8000/api';
const fetchMock = vi.fn();
const response = (body: unknown): Response => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => body,
  clone: () => response(body),
} as unknown as Response);
const last = () => fetchMock.mock.calls.at(-1) ?? [];
const lastInit = () => (last()[1] ?? {}) as RequestInit;

describe('role fetchers', () => {
  beforeEach(() => {
    dataCacheManager.clear();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(response({ items: [], results: [], groups: [], templates: [], colors: [] }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('uses the role catalog and list contracts', async () => {
    await fetchRoleCatalog();
    expect(String(last()[0])).toBe(`${API_BASE}/admin/roles/catalog`);
    await fetchRoles();
    expect(String(last()[0])).toBe(`${API_BASE}/admin/roles`);
  });

  it('maps role CRUD and preserves expectedUpdatedAt on update', async () => {
    fetchMock.mockResolvedValue(response({ id: 'r1', slug: 'coach' }));
    await fetchRole('r1');
    expect(String(last()[0])).toBe(`${API_BASE}/admin/roles/r1`);
    await createRole({ name: 'Coach', color: 'gold', permissions: [] });
    expect(lastInit().method).toBe('POST');
    await updateRole('r1', { permissions: ['courses.create'], expectedUpdatedAt: '2026-01-01T00:00:00Z' });
    expect(lastInit().method).toBe('PATCH');
    expect(JSON.parse(String(lastInit().body))).toMatchObject({ expectedUpdatedAt: '2026-01-01T00:00:00Z' });
    await deleteRole('r1', 'r2');
    expect(String(last()[0])).toBe(`${API_BASE}/admin/roles/r1?reassignTo=r2`);
  });

  it('covers reorder, members, assignment, and audit query contracts', async () => {
    await reorderRoles(['r1', 'r2']);
    expect(JSON.parse(String(lastInit().body))).toEqual({ orderedIds: ['r1', 'r2'] });
    await fetchRoleMembers('r1', { q: 'sara', page: 2 });
    expect(String(last()[0])).toBe(`${API_BASE}/admin/roles/r1/members?q=sara&page=2`);
    await addRoleMembers('r1', ['u1', 'u2']);
    expect(JSON.parse(String(lastInit().body))).toEqual({ userIds: ['u1', 'u2'] });
    await removeRoleMember('r1', 'u1');
    expect(String(last()[0])).toBe(`${API_BASE}/admin/roles/r1/members/u1`);
    await setUserRoles('u1', ['r2']);
    expect(String(last()[0])).toBe(`${API_BASE}/admin/users/u1/roles`);
    await fetchAudit({ action: 'role.updated', actor: 'u1', targetType: 'role', targetId: 'r1', page: 3 });
    expect(String(last()[0])).toBe(`${API_BASE}/admin/audit?action=role.updated&actor=u1&targetType=role&targetId=r1&page=3`);
  });

  it('invalidates role and auth namespaces after mutations', async () => {
    dataCacheManager.set(['admin-roles', 'list'], ['stale']);
    dataCacheManager.set(['auth', 'me'], { permissions: [] });
    fetchMock.mockResolvedValue(response({ id: 'r1' }));
    await updateRole('r1', { expectedUpdatedAt: 'now' });
    expect(dataCacheManager.get(['admin-roles', 'list'])).toBeUndefined();
    expect(dataCacheManager.get(['auth', 'me'])).toBeUndefined();
  });
});
