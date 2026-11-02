import { describe, expect, it } from 'vitest';
import permissionCatalog from '@/shared/json/permissionCatalog.json';
import { can, canAny, PERMISSION_KEYS, type PermissionKey } from '@/shared/lib/permissions';

describe('permissions', () => {
  it('keeps the literal frontend key union in the backend catalog order', () => {
    expect(PERMISSION_KEYS).toEqual(permissionCatalog.map((permission) => permission.key));
  });

  it.each([
    { name: 'missing user', user: null, permission: 'admin.access', expected: false },
    {
      name: 'explicit permission',
      user: { permissions: ['admin.access'] as PermissionKey[] },
      permission: 'admin.access',
      expected: true,
    },
    {
      name: 'different permission',
      user: { permissions: ['users.view'] as PermissionKey[] },
      permission: 'admin.access',
      expected: false,
    },
    {
      name: 'administrator bypass',
      user: { isAdministrator: true, permissions: [] as PermissionKey[] },
      permission: 'system.maintenance',
      expected: true,
    },
  ])('can handles $name', ({ user, permission, expected }) => {
    expect(can(user, permission as PermissionKey)).toBe(expected);
  });

  it('canAny accepts one or more permissions and short-circuits administrators', () => {
    const user = { permissions: ['users.view'] as PermissionKey[] };

    expect(canAny(user, ['admin.access', 'users.view'])).toBe(true);
    expect(canAny(user, ['admin.access', 'roles.manage'])).toBe(false);
    expect(canAny(user, 'users.view')).toBe(true);
    expect(canAny({ isAdministrator: true }, ['system.maintenance'])).toBe(true);
  });
});
