import type { CourseDetail as SharedCourseDetail } from '@/shared/types/entities';

/** The learner-facing lesson panels available in the course player. */
export type CourseTab = 'lesson' | 'problems' | 'live' | 'exam' | 'discussion';

/** Which surface a shared course component renders on. */
export type CourseSurface = 'desktop' | 'mobile';
export type CourseStatus = 'draft' | 'in_review' | 'published' | 'archived';
export type CourseLessonKind = 'video' | 'article' | 'quiz' | 'resource';

/** Public instructor fields exposed by the learner-facing course payload. */
export interface CourseInstructor {
  id: string;
  name: string;
  headline?: string;
  credential?: string;
  bio?: string;
  expertise?: string[];
  avatarUrl?: string;
}

/** Additive course lifecycle fields; omitted fields preserve legacy API behavior. */
export interface CourseLifecycleFields {
  status?: CourseStatus;
  isPreview?: boolean;
  enrollable?: boolean;
  canReadAnnouncements?: boolean;
  instructors?: CourseInstructor[];
}

/** Additive lesson metadata for preview and hosted-video aware clients. */
export interface CourseLessonLifecycleFields {
  kind?: CourseLessonKind;
  isFreePreview?: boolean;
  hasVideo?: boolean;
  videoSlug?: string | null;
  durationSeconds?: number;
  isPublished?: boolean;
}

/** Course detail shape used by the landing page after the additive contract. */
export type CourseLandingCourse = SharedCourseDetail & CourseLifecycleFields;
