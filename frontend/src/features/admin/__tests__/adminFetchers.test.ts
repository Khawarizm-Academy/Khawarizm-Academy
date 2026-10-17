import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchEvents,
  fetchLoginSeries,
  fetchOverview,
  fetchSessions,
  fetchUserDetail,
  fetchUsers,
  revokeAdminSession,
  updateUserRole,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  fetchContentSchema,
  fetchContent,
  createContent,
  updateContent,
  deleteContent,
} from '@/features/admin/data/adminFetchers';

const API_BASE = 'http://localhost:8000/api';

const PAGE_BODY = { total: 0, page: 1, pageSize: 20, results: [] };

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
    clone: () => jsonResponse(body),
  } as unknown as Response;
}

const fetchMock = vi.fn();

/** The path + query the last request went to, with the API base stripped. */
const lastUrl = (): string => String(fetchMock.mock.calls.at(-1)?.[0]).replace(API_BASE, '');

/** The last request's method and parsed body. */
const lastCall = () => {
  const [, init] = fetchMock.mock.calls.at(-1) ?? [];
  return {
    method: String(init?.method),
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  };
};

describe('admin fetchers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => jsonResponse(PAGE_BODY));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the user filters as query params and drops an "all" role', async () => {
    await fetchUsers({ q: 'ahmad', role: 'student', page: 3 });
    expect(lastUrl()).toBe('/admin/users?q=ahmad&role=student&page=3');

    await fetchUsers({ q: '', role: 'all', page: 1 });
    expect(lastUrl()).toBe('/admin/users?page=1');
  });

  it('maps the session active filter onto the API booleans', async () => {
    await fetchSessions({ active: 'active' });
    expect(lastUrl()).toBe('/admin/sessions?active=true');

    await fetchSessions({ active: 'inactive' });
    expect(lastUrl()).toBe('/admin/sessions?active=false');
  });

  it('leaves the session list unfiltered for "all" and for an unset filter', async () => {
    await fetchSessions({ active: 'all', q: 'sara', page: 2 });
    expect(lastUrl()).toBe('/admin/sessions?q=sara&page=2');

    await fetchSessions();
    expect(lastUrl()).toBe('/admin/sessions');
  });

  it('points every section at its own endpoint', async () => {
    await fetchOverview();
    expect(lastUrl()).toBe('/admin/overview');

    await fetchUserDetail('user-1');
    expect(lastUrl()).toBe('/admin/users/user-1');

    await fetchLoginSeries('30');
    expect(lastUrl()).toBe('/admin/analytics/logins?days=30');

    await fetchEvents('all');
    expect(lastUrl()).toBe('/admin/events');

    await fetchEvents('login');
    expect(lastUrl()).toBe('/admin/events?kind=login');
  });

  it('posts the role change to the user sub-route', async () => {
    await updateUserRole('user-1', 'admin');

    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(`${API_BASE}/admin/users/user-1/role`);
    expect(lastCall()).toEqual({ method: 'POST', body: { role: 'admin' } });
  });

  it('posts the revoke to the session sub-route', async () => {
    await revokeAdminSession('session-1');

    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(`${API_BASE}/admin/sessions/session-1/revoke`);
    expect(lastCall().method).toBe('POST');
  });

  it('creates and updates and deletes a user through the admin endpoints', async () => {
    await createAdminUser({ email: 'a@b.com', fullName: 'Ahmad', role: 'admin', isActive: true });
    const callCreate = fetchMock.mock.calls.at(-1) ?? [];
    expect(String(callCreate[0])).toBe(`${API_BASE}/admin/users`);
    expect(lastCall()).toEqual({
      method: 'POST',
      body: { email: 'a@b.com', fullName: 'Ahmad', role: 'admin', isActive: true },
    });

    await updateAdminUser('u-1', { phone: '123', isActive: false });
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(`${API_BASE}/admin/users/u-1`);
    expect(lastCall().method).toBe('PATCH');
    expect(lastCall().body).toEqual({ phone: '123', isActive: false });

    await deleteAdminUser('u-1');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(`${API_BASE}/admin/users/u-1`);
    expect(lastCall().method).toBe('DELETE');
  });

  it('reads and writes content collections from the API', async () => {
    await fetchContentSchema();
    expect(lastUrl()).toBe('/admin/content/schema');

    await fetchContent('courses', { q: 'ai', page: 2 });
    expect(lastUrl()).toBe('/admin/content/courses?q=ai&page=2');

    await fetchContent('events');
    expect(lastUrl()).toBe('/admin/content/events');

    await createContent('courses', { slug: 'intro', title: 'Intro' });
    const callCreateContent = fetchMock.mock.calls.at(-1) ?? [];
    expect(String(callCreateContent[0])).toBe(`${API_BASE}/admin/content/courses`);
    expect(lastCall().method).toBe('POST');
    expect(lastCall().body).toEqual({ slug: 'intro', title: 'Intro' });

    await updateContent('courses', 'row-1', { title: 'Updated' });
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(`${API_BASE}/admin/content/courses/row-1`);
    expect(lastCall().method).toBe('PATCH');
    expect(lastCall().body).toEqual({ title: 'Updated' });

    await deleteContent('events', 'e-1');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(`${API_BASE}/admin/content/events/e-1`);
    expect(lastCall().method).toBe('DELETE');
  });
});
