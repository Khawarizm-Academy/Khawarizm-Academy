import { apiDelete, apiGet, apiPatch, apiPost } from '@/shared/lib/apiClient';
import type { AnnouncementInput, CourseAnnouncement } from '@/features/studio/announcements/types';

export const fetchAnnouncementCourses = () =>
  apiGet<{ items: Array<{ slug: string; title: string; status?: string }> }>('/studio/announcements/courses');

export async function fetchCourseAnnouncements(slug: string): Promise<CourseAnnouncement[]> {
  const result = await apiGet<{ items?: CourseAnnouncement[] }>(`/courses/${encodeURIComponent(slug)}/announcements`);
  return result.items ?? [];
}

export const fetchCourseAnnouncement = (slug: string, id: string) =>
  apiGet<CourseAnnouncement>(`/courses/${encodeURIComponent(slug)}/announcements/${encodeURIComponent(id)}`);

export const createCourseAnnouncement = (slug: string, input: AnnouncementInput) =>
  apiPost<CourseAnnouncement>(`/courses/${encodeURIComponent(slug)}/announcements`, input);

export const updateCourseAnnouncement = (slug: string, id: string, input: Partial<AnnouncementInput>) =>
  apiPatch<CourseAnnouncement>(
    `/courses/${encodeURIComponent(slug)}/announcements/${encodeURIComponent(id)}`,
    input,
  );

export const deleteCourseAnnouncement = (slug: string, id: string) =>
  apiDelete<void>(`/courses/${encodeURIComponent(slug)}/announcements/${encodeURIComponent(id)}`);

export const setCourseAnnouncementPinned = (slug: string, id: string, pinned: boolean) =>
  apiPost<CourseAnnouncement>(
    `/courses/${encodeURIComponent(slug)}/announcements/${encodeURIComponent(id)}/pin`,
    { pinned },
  );
