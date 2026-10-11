import { createContext, useContext } from 'react';
import { type LucideIcon } from 'lucide-react';
import { resolveIcon } from '../../../shared/lib/navigation';
import dashboardViewsJson from '../../../shared/json/dashboardViews.json';
import type { EnrolledCourse } from '../types';
import type { StatChipItem } from '../components/DashboardStatsHeader';
import type { SavedScholarshipItem } from '../components/SavedScholarshipsView';
import type { CompetitionItem, CertificateItem } from '../components/CompetitionsCertificatesView';
import type { NotificationItemData } from '../components/NotificationsView';

export const LIVE_COURSE = dashboardViewsJson.liveCard.courseTitle;
export const FULL_PAGE_VIEWS = dashboardViewsJson.fullPageViews;
export const SINGLE_COLUMN_VIEWS = dashboardViewsJson.singleColumnViews;
export const SPOTLIGHT = dashboardViewsJson.spotlight;
export const CHALLENGE_ITEM = dashboardViewsJson.challengeItem as CompetitionItem;

/** Views whose active tab lives in the mobile sub-nav strip. */
export const SUB_NAV_VIEWS = ['main', 'enrolled', 'profile'];

/** Mock unread badge shared by every bell in the dashboard chrome. */
export const UNREAD_COUNT = 5;

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
  chips?: ViewChip[];
}

/** Raw shape of a dashboardViews.json view entry. */
interface RawViewHeader {
  title: string;
  subtitle: string;
  chips?: Array<Omit<ViewChip, 'icon'> & { icon: string }>;
}

const RAW_VIEW_HEADERS = dashboardViewsJson.views as Record<string, RawViewHeader>;

/** Header text and stat chips per view. Missing chips fall back to the main ones. */
export const VIEW_HEADERS: Record<string, ViewHeader> = Object.fromEntries(
  Object.entries(RAW_VIEW_HEADERS).map(([key, header]) => [
    key,
    { ...header, chips: header.chips?.map((chip) => ({ ...chip, icon: resolveIcon(chip.icon) })) },
  ])
);

export interface DashboardContextValue {
  currentView: string;
  isLive: boolean;
  isEmpty: boolean;
  isSavedView: boolean;
  header: ViewHeader;
  statChips: StatChipItem[];
  coursesData: EnrolledCourse[];
  isLoadingCourses: boolean;
  activeWorkspaceCourse: string | null;
  isLiveClassroomOpen: boolean;
  selectedScholarship: SavedScholarshipItem | null;
  selectedCompetition: CompetitionItem | null;
  previewCertificateItem: CertificateItem | null;
  selectView: (viewId: string) => void;
  openWorkspace: (courseTitle: string) => void;
  openLiveClassroom: () => void;
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