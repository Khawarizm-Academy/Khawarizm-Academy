import type { PermissionKey } from '@/shared/lib/permissions';

export type StudioStatus = 'draft' | 'in_review' | 'published' | 'archived';
export interface StudioCourse { id: string; slug: string; title: string; status: StudioStatus; thumbnailUrl: string; instructor: string; lessonsCount: number; enrolledCount: number; updatedAt: string; readiness?: number | null; }
export interface StudioSeriesPoint { date: string; enrollments: number; }
export interface StudioOverview { courses: Record<StudioStatus, number>; enrollments: number; inReview: number; readiness: number; inbox: Array<{ kind: string; title: string; courseSlug?: string }>; recentActivity: Array<{ kind: string; title: string; courseSlug?: string; at: string }>; series: StudioSeriesPoint[]; }
export interface StudioCoursePage { items: StudioCourse[]; total: number; page: number; pageSize: number; }
export interface StudioSection { key: string; label: string; icon: string; permission: PermissionKey; route: string; mobile: boolean; }
export interface InstructorProfile { headline: string; bio: string; credential: string; expertise: string[]; avatarUrl: string; }
