import type {
  CourseLevelKey,
  CourseStatusKey,
  ScholarshipCoverageKey,
  DegreeLevelKey,
  EventFormatKey,
} from '@/shared/lib/localization';

export interface Course {
  id: string;
  title: string;
  category: string;
  level: CourseLevelKey | 'مبتدئ' | 'متوسط' | 'متقدم';
  duration: string;
  studentsCount?: string;
  instructor?: string;
  price?: string;
  status?: CourseStatusKey | 'متاح' | 'قريباً' | 'مغلق' | string;
  thumbnailType: 'ai_generative' | 'web_frontend' | 'python_data' | 'ai_ml';
}

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  location: string;
  deadlineText: string;
  deadlineUrgency?: 'critical' | 'warning' | 'open';
  coverage: ScholarshipCoverageKey | 'ممولة بالكامل' | 'تمويل جزئي' | 'تدريب عملي' | 'جزئية' | string;
  degreeLevel?: DegreeLevelKey | 'ماجستير' | 'بكالوريوس' | 'دكتوراه' | 'تدريب مهني' | string;
  iconType?: 'university' | 'globe' | 'briefcase';
  thumbnailType: 'astrolabe_scholarship' | 'campus_night' | 'leadership_dubai';
}

/** Where a lesson sits on the student's path. */
export type CourseLessonStatus = 'locked' | 'active' | 'completed' | 'available';

/** Current phase of a weekly live review session. */
export type LiveSessionState = 'upcoming' | 'live' | 'past';

/** One lesson row inside a module (title + duration only; status is derived). */
export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  summary: string;
}

/** A curriculum module and its ordered lessons. */
export interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

/** The full landing-page picture of one course, merged from base + seed data. */
export interface CourseDetail {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  thumbnailUrl: string;
  tagline: string;
  about: string;
  instructorName: string;
  instructorCredential: string;
  instructorBio: string;
  rating: number;
  reviewCount: number;
  enrolledCount: number;
  duration: string;
  lessonsCount: number;
  levelLabel: string;
  languageLabel: string;
  priceType: 'free' | 'paid';
  priceLabel: string;
  outcomes: string[];
  modules: CourseModule[];
  liveSessions: CourseLiveSession[];
  exam: CourseExam;
  relatedIds: string[];
}

/** A Google Meet weekly review session — a launchpad, never an embedded call. */
export interface CourseLiveSession {
  id: string;
  title: string;
  state: LiveSessionState;
  dateLabel: string;
  timeLabel: string;
}

/** Comprehensive end-of-course exam parameters shown before it unlocks. */
export interface CourseExam {
  questionCount: number;
  minutes: number;
  passThreshold: number;
  attemptsLeft: number;
}

/** One practice problem inside a lesson's problem set. */
export interface CourseProblem {
  id: string;
  prompt: string;
  code: string;
  options: CourseProblemOption[];
  correctOptionId: string;
  explanation: string;
  hint: string;
}

export interface CourseProblemOption {
  id: string;
  label: string;
}

export interface Competition {
  id: string;
  title: string;
  badge: string;
  description: string;
  daysRemaining: string;
  hoursRemaining: string;
  actionText: string;
}

export interface EventItem {
  id: string;
  title: string;
  description?: string;
  badge: string;
  date: string;
  format: EventFormatKey | 'بث مباشر' | 'حضوري' | 'عبر الإنترنت' | string;
  isFeatured?: boolean;
  thumbnailType: 'space_astrolabe' | 'data_science_stage' | 'academic_workshop';
}
