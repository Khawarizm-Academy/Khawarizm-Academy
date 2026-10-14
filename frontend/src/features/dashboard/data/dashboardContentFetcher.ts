import { apiGet } from '@/shared/lib/apiClient';
import type { CompetitionItem, SavedScholarshipItem } from '@/features/dashboard/types';
import type { RawViewHeader } from '@/features/dashboard/context/dashboardContext';

/** Filter chip option lists (view headers/config served with the content block). */
export interface EnrolledFilterOption {
  id: 'all' | 'in-progress' | 'completed';
  label: string;
}
export interface EnrolledSortOption {
  id: 'recent' | 'progress-desc' | 'alphabetical';
  label: string;
}
export interface CompetitionFilterOption {
  id: 'completed' | 'active';
  label: string;
}
export interface SavedTabOption {
  id: 'scholarships' | 'courses';
  label: string;
}

export interface PriorityCardContent {
  title: string;
  track: string;
  currentLesson: number;
  totalLessons: number;
  completionPercentage: number;
  tagLabel: string;
}
export interface LiveCardContent {
  courseTitle: string;
  instructorName: string;
  sessionDescription: string;
  initialMinutes: number;
  initialSeconds: number;
}
export interface SpotlightContent {
  hasChallenge: boolean;
  hasCourse: boolean;
}
export interface ChallengeCardContent {
  badge: string;
  title: string;
  description: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ctaLabel: string;
}

/** The dashboard "views" content block: headers, hero cards and filter chips. */
export interface DashboardViewContent {
  headers: Record<string, RawViewHeader>;
  fullPageViews: string[];
  singleColumnViews: string[];
  savedTabs: SavedTabOption[];
  enrolledFilters: EnrolledFilterOption[];
  enrolledSortOptions: EnrolledSortOption[];
  competitionFilters: CompetitionFilterOption[];
  priorityCard: PriorityCardContent;
  liveCard: LiveCardContent;
  spotlight: SpotlightContent;
  challengeCard: ChallengeCardContent;
  challengeItem: CompetitionItem;
}

/** Chamber payloads that open a notification points its action at. */
export interface DashboardNotificationTargets {
  scholarship: SavedScholarshipItem;
  competition: CompetitionItem;
}

export interface DashboardContentPayload {
  views: DashboardViewContent;
  notifications: DashboardNotificationTargets;
}

/** Static content for every in-dashboard modal chamber. */
export interface DashboardChambersPayload {
  workspaceLessons: Array<{ id: string; title: string; duration: string; isCompleted: boolean }>;
  classroomMessages: Array<{
    id: string;
    sender: string;
    text: string;
    time: string;
    isInstructor?: boolean;
  }>;
  classroomCode: Array<{ tone: string; indent: number; text: string }>;
  arenaLanguages: Array<{ id: 'python' | 'ts'; label: string }>;
  arenaStarterCode: string;
  arenaLeaders: Array<{ name: string; score: string; tone: 'gold' | 'plain' }>;
  scholarshipChecks: Array<{
    kind: 'gpa' | 'static';
    label?: string;
    icon: string;
    status: string;
  }>;
}

/** The wire shape: view headers arrive under a nested `views` key. */
interface ApiDashboardViews extends Omit<DashboardViewContent, 'headers'> {
  views: Record<string, RawViewHeader>;
}
interface ApiDashboardContent {
  views: ApiDashboardViews;
  notifications: DashboardNotificationTargets;
}

/** View headers, hero cards and notification action payloads. */
export async function fetchDashboardContent(): Promise<DashboardContentPayload> {
  const { views, notifications } = await apiGet<ApiDashboardContent>('/dashboard/content');
  const { views: headers, ...rest } = views;
  return { views: { ...rest, headers }, notifications };
}

/** Static content for the in-dashboard modal chambers. */
export function fetchDashboardChambers(): Promise<DashboardChambersPayload> {
  return apiGet<DashboardChambersPayload>('/dashboard/chambers');
}
