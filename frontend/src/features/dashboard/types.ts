export type DashboardState = 'active' | 'live' | 'empty';

export type DashboardView =
  | 'overview'
  | 'main'
  | 'enrolled'
  | 'courses'
  | 'saved'
  | 'achievements'
  | 'notifications'
  | 'profile'
  | 'empty'
  | 'live';

export interface EnrolledCourse {
  id: string;
  title: string;
  track: string;
  progress: number;
  lastLesson: string;
  exactUnitLesson?: string;
  thumbnail: string;
  nextLiveTime?: string;
  instructor?: string;
  totalLessons?: number;
  isCompleted?: boolean;
  completionDate?: string;
  iconType?: 'python' | 'data' | 'ai' | 'uiux' | 'code';
  slug?: string;
}

export interface LiveSessionInfo {
  id: string;
  courseTitle: string;
  instructor: string;
  initialRemainingSeconds: number;
  thumbnail: string;
  meetUrl?: string;
}

export interface DashboardStats {
  attendanceRate: number;
  attendanceNote: string;
  gpa: string;
  gpaRating: string;
  pointsEarned: number;
  rankNote: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  dateText: string;
  type: 'submission' | 'exam' | 'session';
  typeLabel: string;
}

export interface SavedScholarshipItem {
  id: string;
  title: string;
  provider: string;
  deadlineText: string;
  isUrgent: boolean;
  coverage: string;
  gpaRequirement: string;
}

export interface CompetitionItem {
  id: string;
  title: string;
  statusText: string;
  statusColor: 'blue' | 'red' | 'green';
  actionLabel: string;
  actionVariant: 'gold' | 'sky';
}

export interface CertificateItem {
  id: string;
  title: string;
  issueDate: string;
  credentialId: string;
  isOfficial: boolean;
}

export interface NotificationItemData {
  id: string;
  message: string;
  timeAgo: string;
  isUnread: boolean;
  type: 'live' | 'scholarship' | 'exam' | 'competition' | 'lesson';
}

export interface FavoriteCourseItem {
  id: string;
  title: string;
  provider: string;
  durationText: string;
}

export interface DashboardNotification {
  id: string;
  title: string;
  timeAgo: string;
  type: 'live' | 'scholarship' | 'exam' | 'competition' | 'lesson' | 'application';
  isRead: boolean;
  link?: string;
}
