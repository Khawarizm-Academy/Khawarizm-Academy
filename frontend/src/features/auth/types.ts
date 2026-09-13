export type AuthMode = 'login' | 'welcome-back';

export interface ReturningUserData {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  activeCoursesCount: number;
  savedScholarshipsCount: number;
}

export const DEFAULT_RETURNING_USER: ReturningUserData = {
  id: 'usr-ahmed-alghamdi',
  name: 'أحمد الغامدي',
  title: 'طالب متميز',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  activeCoursesCount: 3,
  savedScholarshipsCount: 5,
};
