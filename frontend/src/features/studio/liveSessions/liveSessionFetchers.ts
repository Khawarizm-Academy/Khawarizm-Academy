import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/shared/lib/apiClient';
import type { LiveSessionInput, StudioLiveSession } from './types';

const base = (slug: string) => `/studio/courses/${encodeURIComponent(slug)}/live-sessions`;
const rowPath = (slug: string, id: string) => `${base(slug)}/${encodeURIComponent(id)}`;

export const fetchLiveSessions = (slug: string) => apiGet<{ items: StudioLiveSession[] }>(base(slug));
export const fetchGlobalLiveSessions = () => apiGet<{ items: StudioLiveSession[] }>('/studio/live-sessions');
export const createLiveSession = (slug: string, input: LiveSessionInput) => apiPost<StudioLiveSession>(base(slug), input);
export const updateLiveSession = (slug: string, id: string, input: Partial<LiveSessionInput>) => apiPatch<StudioLiveSession>(rowPath(slug, id), input);
export const replaceLiveSession = (slug: string, id: string, input: LiveSessionInput) => apiPut<StudioLiveSession>(rowPath(slug, id), input);
export const deleteLiveSession = (slug: string, id: string) => apiDelete<void>(rowPath(slug, id));
export const cancelLiveSession = (slug: string, id: string) => apiPost<StudioLiveSession>(`${rowPath(slug, id)}/cancel`);
export const addLiveSessionRecording = (slug: string, id: string, input: { recordingUrl?: string; recordingAssetId?: string | null }) => apiPost<StudioLiveSession>(`${rowPath(slug, id)}/recording`, input);
