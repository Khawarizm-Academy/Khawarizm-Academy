import type { PermissionKey } from '@/shared/lib/permissions';

export type StudioStatus = 'draft' | 'in_review' | 'published' | 'archived';
export type LessonKind = 'video' | 'article' | 'quiz' | 'resource';
export interface StudioCourse { id: string; slug: string; title: string; status: StudioStatus; thumbnailUrl: string; instructor: string; lessonsCount: number; enrolledCount: number; updatedAt: string; readiness?: number | null; }
export interface StudioSeriesPoint { date: string; enrollments: number; }
export interface StudioOverview { courses: Record<StudioStatus, number>; enrollments: number; inReview: number; readiness: number; inbox: Array<{ kind: string; title: string; courseSlug?: string }>; recentActivity: Array<{ kind: string; title: string; courseSlug?: string; at: string }>; series: StudioSeriesPoint[]; }
export interface StudioCoursePage { items: StudioCourse[]; total: number; page: number; pageSize: number; }
export interface StudioSection { key: string; label: string; icon: string; permission: PermissionKey; route: string; mobile: boolean; }
export interface InstructorProfile { headline: string; bio: string; credential: string; expertise: string[]; avatarUrl: string; }
export interface StudioResource { id: string; title: string; url: string; kind: string; order: number; }
export interface StudioVideoSummary { id: string; slug: string; title: string; status: string; durationSeconds: number; playbackMode: string; protection: string; provider?: string | null; }
export interface StudioLesson { id: string; lessonId: string; title: string; duration: string; summary: string; order: number; kind: LessonKind; content: string; isFreePreview: boolean; isPublished: boolean; hasVideo: boolean; videoSlug?: string | null; video?: StudioVideoSummary | null; durationSeconds: number; updatedAt: string; resources: StudioResource[]; }
export interface StudioModule { id: string; moduleId: string; title: string; order: number; updatedAt: string; lessons: StudioLesson[]; }
export interface StudioQuizSummary { id: string; kind: string; title: string; isPublished: boolean; questionCount: number; attemptsCount: number; }
export interface StudioChecklistIssue { code: string; severity: 'blocking' | 'warning'; target: string; message: string; }
export interface StudioChecklist { issues: StudioChecklistIssue[]; ready: boolean; completeness: number; }
export interface StudioStaff { id: string; name: string; headline: string; avatarUrl: string; kind: string; }
export interface StudioEditorCourse { id: string; slug: string; title: string; status: StudioStatus; category: string; categorySlug: string; thumbnailUrl: string; tagline: string; about: string; courseLevel: string; levelLabel: string; language: string; priceType: string; priceLabel: string; outcomes: string[]; relatedIds: string[]; reviewNote: string; updatedAt: string; modules: StudioModule[]; staff: StudioStaff[]; quizzes: StudioQuizSummary[]; checklist: StudioChecklist; }
export type StudioPickerAsset = StudioVideoSummary;
