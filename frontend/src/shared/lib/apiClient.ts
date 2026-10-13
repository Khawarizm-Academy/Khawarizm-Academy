/**
 * Thin fetch wrapper for the Khawarizm Academy API.
 *
 * The app reads from the in-repo mocks by default. Setting
 * `VITE_USE_MOCK_API=false` routes the same feature fetchers to the Django
 * backend at `VITE_API_BASE_URL`, so no component has to change.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

/** True while features should read from the local mocks. */
export const isMockApi = (import.meta.env.VITE_USE_MOCK_API ?? 'true') !== 'false';

/** Error carrying the HTTP status, so callers can special-case a 404. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** One request helper every feature fetcher shares. */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API ${response.status}: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export const apiGet = <T>(path: string) => apiRequest<T>(path, { method: 'GET' });

export const apiPost = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const apiPatch = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });

/** Serialize params into a query string, skipping undefined and 'all' values. */
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'all') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
