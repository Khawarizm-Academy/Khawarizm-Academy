/**
 * Thin fetch wrapper for the Khawarizm Academy API.
 *
 * The app is fully API-driven — there are no mocks. Every feature fetcher goes
 * through these helpers against `VITE_API_BASE_URL` (set in frontend/.env.development
 * and frontend/.env.production).
 *
 * Every request carries the stored access token. On a 401 the client silently
 * rotates the refresh token once and replays the call; when that also fails it
 * clears the tokens and reports the session loss to the auth provider, which
 * signs the reader out and tells them why (for example, signed in elsewhere).
 */

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/shared/lib/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Fail loudly at startup: a missing base URL would otherwise surface as cryptic fetch errors.
if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not set. Add it to frontend/.env.development or frontend/.env.production.');
}

/** Error carrying the HTTP status and the API error code, so callers can react. */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Called once when the session can no longer be recovered, with the reason code. */
type AuthLostHandler = (code: string) => void;
let authLostHandler: AuthLostHandler | null = null;

export function setAuthLostHandler(handler: AuthLostHandler | null): void {
  authLostHandler = handler;
}

// These endpoints must never trigger the refresh-and-replay dance.
const AUTH_FREE_PATHS = ['/auth/config', '/auth/firebase', '/auth/refresh'];

let refreshInFlight: Promise<boolean> | null = null;

/** Rotate the refresh token once, collapsing concurrent 401s onto one call. */
function refreshTokens(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { accessToken: string; refreshToken: string };
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Read an error body without throwing when it is empty or not JSON. */
async function readErrorBody(response: Response): Promise<{ detail?: string; code?: string }> {
  try {
    return (await response.json()) as { detail?: string; code?: string };
  } catch {
    return {};
  }
}

/** One request helper every feature fetcher shares. */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isAuthFree = AUTH_FREE_PATHS.some((prefix) => path.startsWith(prefix));

  const send = () => {
    const token = getAccessToken();
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  };

  let response = await send();

  if (response.status === 401 && !isAuthFree) {
    const original = await readErrorBody(response.clone());
    const refreshed = await refreshTokens();
    if (refreshed) {
      response = await send();
    } else {
      clearTokens();
      const code = original.code ?? 'session_expired';
      authLostHandler?.(code);
      throw new ApiError(401, original.detail ?? 'انتهت الجلسة.', code);
    }
  }

  if (!response.ok) {
    const payload = await readErrorBody(response);
    throw new ApiError(response.status, payload.detail ?? `API ${response.status}: ${response.statusText}`, payload.code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiGet = <T>(path: string) => apiRequest<T>(path, { method: 'GET' });

export const apiPost = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const apiPatch = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });

export const apiDelete = <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' });

/** Progress callback receiving the upload percent 0-100. */
export type UploadProgressHandler = (percent: number) => void;

/**
 * Multipart upload with real byte progress — `fetch` cannot report upload
 * progress, so this path rides XMLHttpRequest. Auth semantics mirror
 * `apiRequest`: one silent refresh-and-replay on 401, then a lost session.
 */
export function apiUpload<T>(path: string, formData: FormData, onProgress?: UploadProgressHandler): Promise<T> {
  const isAuthFree = AUTH_FREE_PATHS.some((prefix) => path.startsWith(prefix));

  const send = () =>
    new Promise<{ status: number; body: ArrayBuffer; statusText: string }>((resolve, reject) => {
      const token = getAccessToken();
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}${path}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        };
      }
      xhr.onload = () => resolve({ status: xhr.status, body: xhr.response, statusText: xhr.statusText });
      xhr.onerror = () => reject(new Error('تعذّر الاتصال بالخادم أثناء الرفع.'));
      xhr.onabort = () => reject(new Error('أُلغيّ الرفع.'));
      xhr.responseType = 'arraybuffer';
      xhr.send(formData);
    });

  const decodeBody = (body: ArrayBuffer) => {
    try {
      return JSON.parse(new TextDecoder().decode(body)) as { detail?: string; code?: string };
    } catch {
      return {};
    }
  };

  return (async () => {
    let response = await send();
    const ok = response.status >= 200 && response.status < 300;

    if (response.status === 401 && !isAuthFree) {
      const original = decodeBody(response.body);
      const refreshed = await refreshTokens();
      if (refreshed) {
        response = await send();
      } else {
        clearTokens();
        const code = original.code ?? 'session_expired';
        authLostHandler?.(code);
        throw new ApiError(401, original.detail ?? 'انتهت الجلسة.', code);
      }
    }

    if (!ok) {
      const payload = decodeBody(response.body);
      throw new ApiError(response.status, payload.detail ?? `API ${response.status}: ${response.statusText}`, payload.code);
    }
    return decodeBody(response.body) as T;
  })();
}

/** Vercel functions reject request bodies over ~4.5 MB at the edge with a
    bare 413 that carries no CORS headers — the browser then shows a cryptic
    "blocked by CORS policy" pair instead of the size problem. A file beyond
    the cap on a *.vercel.app API is doomed, so the caller refuses it
    client-side with the real instruction; a real-server API stays uncapped. */
export const VERCEL_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

export const vercelUploadTooLarge = (file: File | null): boolean =>
  file !== null && /(^|\.)vercel\.app$/.test(new URL(API_BASE_URL).hostname) && file.size > VERCEL_UPLOAD_MAX_BYTES;

/** Serialize params into a query string, skipping undefined and 'all' values. */
export function buildQuery(params: Record<string, string | number | undefined>): string {  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'all') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
