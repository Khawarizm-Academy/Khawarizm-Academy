import { apiGet, apiPost, apiPatch, buildQuery } from '@/shared/lib/apiClient';
import type { InstructorProfile, StudioCoursePage, StudioOverview } from '@/features/studio/types';

export const fetchStudioOverview = () => apiGet<StudioOverview>('/studio/overview');
export const fetchStudioCourses = (params: { status?: string; q?: string; sort?: string; page?: number; scope?: string } = {}) => apiGet<StudioCoursePage>(`/studio/courses${buildQuery(params)}`);
export const createStudioCourse = (input: { title: string; categoryLabel: string; courseLevel: string }) => apiPost<{ id: string; slug: string }>('/studio/courses', input);
export const duplicateStudioCourse = (slug: string, keepVideos = false) => apiPost<Record<string, unknown>>(`/studio/courses/${encodeURIComponent(slug)}/duplicate${keepVideos ? '?keepVideos=true' : ''}`);
export const bulkArchiveStudioCourses = (slugs: string[]) => apiPost<{ archived: number }>('/studio/courses/bulk-archive', { slugs });
export const fetchStudioProfile = () => apiGet<InstructorProfile>('/studio/profile');
export const updateStudioProfile = (input: Partial<InstructorProfile>) => apiPatch<InstructorProfile>('/studio/profile', input);
