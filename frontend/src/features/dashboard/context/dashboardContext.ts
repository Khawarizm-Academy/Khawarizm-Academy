import { createContext, useContext } from 'react';
import { type LucideIcon } from 'lucide-react';
import { resolveIcon } from '@/shared/lib/navigation';
import type { EnrolledCourse } from '@/features/dashboard/types';
import type { StatChipItem } from '@/features/dashboard/components/chrome/DashboardStatsHeader';
import type { SavedScholarshipItem } from '@/features/dashboard/components/views/SavedScholarshipsView';
import type { CompetitionItem, CertificateItem } from '@/features/dashboard/components/views/CompetitionsCertificatesView';
import type { NotificationItemData } from '@/features/dashboard/components/views/NotificationsView';

/** Views whose active tab lives in the mobile sub-nav strip. */
export const SUB_NAV_VIEWS = ['main', 'enrolled', 'profile'];

export interface ViewChip {
  icon: LucideIcon;
  label: string;
  iconColor: string;
  view?: string;
  action?: 'live' | 'course';
}

export interface ViewHeader {
  title: string;
  subtitle: string;
  /** True when the title is a greeting placeholder that must be filled with the real name. */
  greeting?: boolean;
  chips?: ViewChip[];
}

/** Raw shape of a dashboard view entry (icons arrive as names, not components). */
export interface RawViewHeader {
  title: string;
  subtitle: string;
  greeting?: boolean;
  chips?: Array<Omit<ViewChip, 'icon'> & { icon: string }>;
}

/** Hydrate the raw view headers with their icon components. */
export function buildViewHeaders(rawHeaders: Record<string, RawViewHeader>): Record<string, ViewHeader> {
  return Object.fromEntries(
    Object.entries(rawHeaders).map(([key, header]) => [
      key,
      { ...header, chips: header.chips?.map((chip) => ({ ...chip, icon: resolveIcon(chip.icon) })) },
    ])
  );
}

export interface DashboardContextValue {
  currentView: string;
  isLive: boolean;
  isEmpty: boolean;
  isSavedView: boolean;
  header: ViewHeader;
  statChips: StatChipItem[];
  unreadCount: number;
  coursesData: EnrolledCourse[];
  isLoadingCourses: boolean;
  activeWorkspaceCourse: string | null;
  /** The course a live chamber was opened for, or null when none is open. */
  activeLiveSession: { courseTitle: string; instructorName: string } | null;
  selectedScholarship: SavedScholarshipItem | null;
  selectedCompetition: CompetitionItem | null;
  previewCertificateItem: CertificateItem | null;
  selectView: (viewId: string) => void;
  openWorkspace: (courseTitle: string) => void;
  openLiveClassroom: (course: EnrolledCourse) => void;
  selectScholarship: (scholarship: SavedScholarshipItem) => void;
  selectCompetition: (competition: CompetitionItem) => void;
  previewCertificate: (certificate: CertificateItem) => void;
  closeWorkspace: () => void;
  closeLiveClassroom: () => void;
  closeScholarship: () => void;
  closeCompetition: () => void;
  closeCertificate: () => void;
  handleNotificationAction: (notif: NotificationItemData) => void;
}

export const DashboardContext = createContext<DashboardContextValue | null>(null);

/** Every piece of dashboard state the chrome shares, without prop drilling. */
export function useDashboard(): DashboardContextValue {
  const value = useContext(DashboardContext);
  if (!value) throw new Error('[dashboard] useDashboard must be used inside DashboardProvider.');
  return value;
}
