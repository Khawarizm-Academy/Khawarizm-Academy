import type { PermissionKey } from '@/shared/lib/permissions';

export type StudioStatus = 'draft' | 'in_review' | 'published' | 'archived';
export type LessonKind = 'video' | 'article' | 'quiz' | 'resource';
export interface StudioCourse { id: string; slug: string; title: string; status: StudioStatus; thumbnailUrl: string; instructor: string; lessonsCount: number; enrolledCount: number; updatedAt: string; readiness?: number | null; }
export interface StudioSeriesPoint { date: string; enrollments: number; }
export interface StudioOverview { courses: Record<StudioStatus, number>; enrollments: number; inReview: number; readiness: number; inbox: Array<{ kind: string; title: string; note?: string; courseSlug?: string }>; recentActivity: Array<{ kind: string; title: string; courseSlug?: string; at: string }>; series: StudioSeriesPoint[]; }
export interface StudioCoursePage { items: StudioCourse[]; total: number; page: number; pageSize: number; }
export interface StudioSection { key: string; label: string; icon: string; permission: PermissionKey; route: string; mobile: boolean; }
export interface InstructorProfile { headline: string; bio: string; credential: string; expertise: string[]; avatarUrl: string; }
export interface StudioResource { id: string; title: string; url: string; kind: string; order: number; }
export type StudioVideoStatus = 'uploading' | 'processing' | 'ready' | 'staged' | 'error';
export type StudioVideoProvider = 'google_drive' | 'telegram' | 'youtube' | 'vimeo' | 'external' | string;
export interface StudioPendingUpload { sessionId: string; chunkSize: number; offset: number; total: number; status: string; progress: number; fileName: string; firstChunkSha256: string; }
export interface StudioVideoSummary { id: string; slug: string; title: string; status: StudioVideoStatus | string; durationSeconds: number; playbackMode: string; protection: string; provider?: string | null; posterUrl?: string; progress?: number; sizeBytes?: number; viewCount?: number; lessonsUsing?: number | Array<{ course: string; lesson: string; title: string }>; effectivePlan?: string; errorMessage?: string; pendingUpload?: StudioPendingUpload | null; }
export interface StudioLesson { id: string; lessonId: string; title: string; duration: string; summary: string; order: number; kind: LessonKind; content: string; isFreePreview: boolean; isPublished: boolean; hasVideo: boolean; videoSlug?: string | null; video?: StudioVideoSummary | null; durationSeconds: number; updatedAt: string; resources: StudioResource[]; }
export interface StudioModule { id: string; moduleId: string; title: string; order: number; updatedAt: string; lessons: StudioLesson[]; }
export interface StudioQuizSummary { id: string; kind: string; title: string; isPublished: boolean; questionCount: number; attemptsCount: number; }
export interface StudioChecklistIssue { code: string; severity: 'blocking' | 'warning'; target: string; message: string; }
export interface StudioChecklist { issues: StudioChecklistIssue[]; ready: boolean; completeness: number; }
export interface StudioStaff { id: string; userId: string; name: string; headline: string; avatarUrl: string; kind: string; }
export interface StudioEditorCourse { id: string; slug: string; title: string; status: StudioStatus; category: string; categorySlug: string; thumbnailUrl: string; tagline: string; about: string; courseLevel: string; levelLabel: string; language: string; priceType: string; priceLabel: string; outcomes: string[]; relatedIds: string[]; reviewNote: string; updatedAt: string; modules: StudioModule[]; staff: StudioStaff[]; quizzes: StudioQuizSummary[]; checklist: StudioChecklist; }
export type StudioPickerAsset = StudioVideoSummary;
export interface StudioVideoLibraryPage { results: StudioVideoSummary[]; total: number; page: number; pageSize: number; }
export interface StudioVideoProviderOption { code: StudioVideoProvider; name: string; kind: 'storage' | 'link' | string; needs: string[]; available: boolean; reason: string; packagingPolicy: 'auto' | 'always' | 'never' | string; effectivePlan: string; packagingOptions?: { allowPackage: boolean; allowDirect: boolean; allowOverride: boolean; effective: 'package' | 'direct' }; }
export interface StudioVideoCaption { id: string; language: string; label: string; isDefault: boolean; }
export interface StudioVideoDetail extends StudioVideoSummary { captions: StudioVideoCaption[]; usage: Array<{ course: { id: string; slug: string; title: string }; lesson: { id: string; title: string } }>; lastError?: string; diagnostics?: string; }
export interface StudioUploadInit { sessionId: string; chunkSize: number; offset: number; total?: number; fileName?: string; firstChunkSha256?: string; }
