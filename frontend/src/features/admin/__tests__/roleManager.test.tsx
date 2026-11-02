import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoleList, RolePermissionsTab } from '@/features/admin/components/views/RolesView';
import { RoleChips } from '@/features/admin/components/controls/RoleChips';
import { AdminFieldInput } from '@/features/admin/components/controls/AdminFieldInput';
import { allowedSectionsFor, canAccessAdminSection } from '@/features/admin/data/adminSectionAccess';
import { EMPTY_AUTH_USER, type AuthUser } from '@/features/auth/types';
import type { AdminRole, RoleCatalog } from '@/features/admin/types';

const actor = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  ...EMPTY_AUTH_USER,
  id: 'actor-1',
  fullName: 'Operator',
  permissions: ['courses.create'],
  ...overrides,
});

const role = (id: string, slug: string, position: number, overrides: Partial<AdminRole> = {}): AdminRole => ({
  id,
  slug,
  name: slug,
  description: '',
  color: 'gold',
  position,
  permissions: [],
  isSystem: false,
  isDefault: false,
  memberCount: 0,
  canManage: true,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

const catalog: RoleCatalog = {
  colors: ['gold', 'blue'],
  templates: [],
  groups: [{
    key: 'courses',
    label: 'Courses',
    permissions: [
      { key: 'courses.create', label: 'Create courses', description: 'Create', elevated: false, implies: [] },
      { key: 'courses.publish', label: 'Publish courses', description: 'Publish', elevated: true, implies: [] },
      { key: 'courses.edit_own', label: 'Edit own courses', description: 'Edit', elevated: false, implies: ['courses.create'] },
    ],
  }],
};

const apiResponse = (body: unknown): Response => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => body,
  clone: () => apiResponse(body),
} as unknown as Response);

describe('role manager UI behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('reorders with Alt+Down and announces the new rank', () => {
    const onReorder = vi.fn();
    render(<RoleList roles={[role('1', 'first', 3), role('2', 'second', 2)]} selectedSlug="first" onSelect={vi.fn()} onReorder={onReorder} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'إعادة ترتيب first' }), { key: 'ArrowDown', altKey: true });
    expect(onReorder).toHaveBeenCalledWith(0, 1);
    expect(screen.getByText(/المرتبة 2/)).toBeTruthy();
  });

  it('filters navigation and denies a direct roles tab for a users-only actor', () => {
    const usersOnly = actor({ permissions: ['users.view'] });
    const sections = allowedSectionsFor(usersOnly);
    expect(sections.has('users')).toBe(true);
    expect(sections.has('roles')).toBe(false);
    expect(canAccessAdminSection(usersOnly, 'roles')).toBe(false);
    expect(canAccessAdminSection(usersOnly, 'users')).toBe(true);
  });

  it('keeps group toggles within permissions the actor can grant and locks implied permissions', () => {
    const onChange = vi.fn();
    render(<RolePermissionsTab catalog={catalog} role={role('1', 'coach', 2)} actor={actor()} draft={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'تفعيل الكل' }));
    expect(onChange).toHaveBeenCalledWith(['courses.create']);
    expect((screen.getByRole('switch', { name: 'Publish courses' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('switch', { name: 'Edit own courses' }) as HTMLButtonElement).disabled).toBe(true);
    const impliedChange = vi.fn();
    render(<RolePermissionsTab catalog={catalog} role={role('2', 'reviewer', 1)} actor={actor({ permissions: ['courses.edit_own'] })} draft={['courses.edit_own']} onChange={impliedChange} />);
    const createSwitch = screen.getAllByRole('switch', { name: 'Create courses' }).at(-1) as HTMLButtonElement;
    expect(createSwitch.disabled).toBe(true);
    expect(createSwitch.getAttribute('aria-checked')).toBe('true');
  });

  it('requires explicit confirmation before granting administrator', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onChange = vi.fn();
    render(<RolePermissionsTab catalog={{ ...catalog, groups: [] }} role={role('1', 'admin-copy', 2)} actor={actor({ isAdministrator: true, permissions: [] })} draft={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /مشرف كامل/ }));
    expect(confirm).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /مشرف كامل/ }));
    expect(onChange).toHaveBeenCalledWith(['administrator']);
  });

  it('supports multi-role chip assignment and removal', () => {
    const onChange = vi.fn();
    const roles = [{ id: 'r1', slug: 'coach', name: 'Coach', color: 'gold' }];
    const available = [...roles, { id: 'r2', slug: 'reviewer', name: 'Reviewer', color: 'blue' }];
    render(<RoleChips roles={roles} available={available} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Reviewer/ }));
    expect(onChange).toHaveBeenCalledWith([...roles, available[1]]);
    fireEvent.click(screen.getByRole('button', { name: /Coach/ }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('debounces user_ref lookup and returns the selected user id as a structured value', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({ total: 1, page: 1, pageSize: 20, results: [{ id: 'u1', fullName: 'Sara', email: 'sara@example.com', avatarUrl: '', role: 'student', isActive: true, isStaff: false, activeSessions: 0, joinedAt: '', lastSeenAt: null }] }));
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    render(<AdminFieldInput field={{ name: 'owner', attr: 'owner', label: 'Owner', kind: 'user_ref' }} value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Sara' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 2000 });
    expect(await screen.findByRole('option', { name: /Sara/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: /Sara/ }));
    expect(onChange).toHaveBeenCalledWith({ id: 'u1', label: 'Sara' });
  });
});
