import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiGet, apiPost, buildQuery, setAuthLostHandler } from '@/shared/lib/apiClient';
import { getAccessToken, getRefreshToken, setTokens } from '@/shared/lib/authStorage';

const API_BASE = 'http://localhost:8000/api';

/** A minimal `Response`: `apiClient` only reads status, ok, json and clone. */
function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    json: async () => body,
    clone: () => fakeResponse(status, body),
  } as unknown as Response;
}

const fetchMock = vi.fn();

describe('buildQuery', () => {
  it('stays empty when nothing is set', () => {
    expect(buildQuery({})).toBe('');
    expect(buildQuery({ q: '', role: 'all', page: undefined })).toBe('');
  });

  it('keeps only the set values, in the order they were given', () => {
    expect(buildQuery({ q: 'ahmad q', role: 'student', page: 2 })).toBe('?q=ahmad+q&role=student&page=2');
  });

  it('round-trips Arabic text instead of mangling it', () => {
    const query = buildQuery({ q: 'أحمد' });

    expect(new URLSearchParams(query.slice(1)).get('q')).toBe('أحمد');
  });
});

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    setAuthLostHandler(null);
  });

  it('sends the stored access token as a Bearer header', async () => {
    setTokens('access-1', 'refresh-1');
    fetchMock.mockResolvedValue(fakeResponse(200, { ok: true }));

    await expect(apiGet('/auth/me')).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/auth/me`);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer access-1');
  });

  it('omits the header entirely for a visitor', async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, {}));

    await apiGet('/catalog');

    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('rotates a dead token once and replays the original request', async () => {
    setTokens('stale', 'refresh-1');
    fetchMock
      .mockResolvedValueOnce(fakeResponse(401, { code: 'token_expired', detail: 'انتهت الجلسة.' }))
      .mockResolvedValueOnce(fakeResponse(200, { accessToken: 'fresh', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(fakeResponse(200, { id: 'user-1' }));

    await expect(apiGet('/auth/me')).resolves.toEqual({ id: 'user-1' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_BASE}/auth/refresh`);
    expect((fetchMock.mock.calls[2][1]?.headers as Record<string, string>).Authorization).toBe('Bearer fresh');
    expect(getAccessToken()).toBe('fresh');
    expect(getRefreshToken()).toBe('refresh-2');
  });

  it('never runs the refresh dance against the auth endpoints themselves', async () => {
    setTokens('stale', 'refresh-1');
    fetchMock.mockResolvedValue(fakeResponse(401, { detail: 'bad token' }));

    await expect(apiPost('/auth/refresh', {})).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports the API reason and clears the session when the refresh fails', async () => {
    setTokens('stale', 'refresh-1');
    const onAuthLost = vi.fn();
    setAuthLostHandler(onAuthLost);
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse(401, { code: 'signed_in_elsewhere', detail: 'سُجّل الدخول من جهاز آخر.' })
      )
      .mockResolvedValueOnce(fakeResponse(401, {}));

    await expect(apiGet('/dashboard')).rejects.toMatchObject({
      status: 401,
      code: 'signed_in_elsewhere',
      message: 'سُجّل الدخول من جهاز آخر.',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onAuthLost).toHaveBeenCalledWith('signed_in_elsewhere');
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('ends the session without a refresh call when there is no refresh token', async () => {
    const onAuthLost = vi.fn();
    setAuthLostHandler(onAuthLost);
    fetchMock.mockResolvedValue(fakeResponse(401, { detail: 'انتهت الجلسة.' }));

    await expect(apiGet('/dashboard')).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onAuthLost).toHaveBeenCalledWith('session_expired');
  });

  it('carries the status, code and message of a failed response', async () => {
    fetchMock.mockResolvedValue(fakeResponse(403, { code: 'admin_only', detail: 'مخصص للإدارة.' }));

    await expect(apiGet('/admin/overview')).rejects.toMatchObject({
      status: 403,
      code: 'admin_only',
      message: 'مخصص للإدارة.',
    });
  });

  it('survives an error body that is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new SyntaxError('not json');
      },
      clone: () => fakeResponse(500, '<html>oops</html>'),
    } as unknown as Response);

    await expect(apiGet('/dashboard')).rejects.toMatchObject({
      status: 500,
      code: undefined,
      message: 'API 500: Internal Server Error',
    });
  });
});
