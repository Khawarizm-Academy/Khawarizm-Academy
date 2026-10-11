import authJson from '@/shared/json/auth.json';

export type AuthMode = 'login' | 'welcome-back';

/** The two rendering surfaces an auth view knows about. */
export type AuthSurface = 'desktop' | 'mobile';

export interface ReturningUserData {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  activeCoursesCount: number;
  savedScholarshipsCount: number;
}

interface AuthModeOption {
  key: AuthMode;
  shortLabel: string;
  longLabel: string;
}

/** Demo-mode pills; short label below lg, long label on the desktop split screen. */
export const AUTH_MODE_OPTIONS = authJson.modeOptions as AuthModeOption[];

export const DEFAULT_RETURNING_USER: ReturningUserData = {
  id: 'usr-ahmed-alghamdi',
  name: 'أحمد الغامدي',
  title: 'طالب متميز',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  activeCoursesCount: 3,
  savedScholarshipsCount: 5,
};
