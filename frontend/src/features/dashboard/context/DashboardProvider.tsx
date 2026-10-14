import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { getDashboardNavItem, COURSE_CERTIFICATE_ROUTE, COURSE_PLAYER_ROUTE } from '@/shared/lib/navigation';
import { fetchDashboardNotifications, fetchEnrolledCourses } from '@/features/dashboard/data/dashboardFetchers';
import { useDashboardContent } from '@/features/dashboard/context/DashboardContentContext';
import { buildViewHeaders, DashboardContext } from '@/features/dashboard/context/dashboardContext';
import type { DashboardContextValue, ViewChip } from '@/features/dashboard/context/dashboardContext';
import type { EnrolledCourse, NotificationItemData } from '@/features/dashboard/types';
import type { StatChipItem } from '@/features/dashboard/components/chrome/DashboardStatsHeader';
import type { SavedScholarshipItem } from '@/features/dashboard/components/views/SavedScholarshipsView';
import type { CompetitionItem, CertificateItem } from '@/features/dashboard/components/views/CompetitionsCertificatesView';

/** Owns every piece of dashboard state so all chrome reads one source. */
export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { content } = useDashboardContent();

  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const viewParam = queryParams.get('view') || 'main';
  const stateParam = queryParams.get('state'); // 'live' | 'empty' | undefined

  // One canonical id per view, so aliases like ?view=courses need no checks below.
  const currentView = getDashboardNavItem(viewParam)?.id ?? viewParam;
  const isLive = stateParam === 'live' || viewParam === 'live';
  const isEmpty = stateParam === 'empty' || viewParam === 'empty';
  // Saved is icon-only (no nav item); the chrome bookmark lights up on its view.
  const isSavedView = currentView === 'saved';

  // In-dashboard self-contained modal chambers.
  const [activeWorkspaceCourse, setActiveWorkspaceCourse] = useState<string | null>(null);
  const [isLiveClassroomOpen, setIsLiveClassroomOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<SavedScholarshipItem | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<CompetitionItem | null>(null);
  const [previewCertificateItem, setPreviewCertificateItem] = useState<CertificateItem | null>(null);

  const selectView = (viewId: string) => {
    navigate(`/dashboard?view=${viewId}`);
  };

  const viewHeaders = useMemo(() => buildViewHeaders(content.views.headers), [content.views.headers]);
  const liveCourse = content.views.liveCard.courseTitle;

  const chamberActions: Record<string, () => void> = {
    live: () => setIsLiveClassroomOpen(true),
    course: () => setActiveWorkspaceCourse(liveCourse),
  };

  // A chip opens a view or a chamber, and some chips are labels only.
  const openChip = ({ view, action }: ViewChip) => {
    if (action) return chamberActions[action];
    if (view) return () => selectView(view);
    return undefined;
  };

  const header = viewHeaders[isLive ? 'live' : currentView] ?? viewHeaders.main;
  const statChips: StatChipItem[] = (header.chips ?? viewHeaders.main.chips ?? []).map((chip) => ({
    icon: chip.icon,
    label: chip.label,
    iconColor: chip.iconColor,
    onClick: openChip(chip),
  }));

  // Course rows for main / live views (Tier 2: real async load via cache).
  const { data: coursesData, isLoading: isLoadingCourses } = useCachedData<EnrolledCourse[]>(
    ['dashboard', 'courses-list'],
    fetchEnrolledCourses,
    { initialData: [] }
  );

  // The bell counts unread rows from the same notifications call the view uses.
  const { data: notifications } = useCachedData<NotificationItemData[]>(
    ['dashboard', 'notifications-view'],
    fetchDashboardNotifications,
    { initialData: [] }
  );
  const unreadCount = notifications.filter((notif) => notif.isUnread).length;

  // Every notification opens the chamber its type points to; course ones deep-link to the player.
  const notificationActions: Record<NotificationItemData['type'], () => void> = {
    live: () => setIsLiveClassroomOpen(true),
    scholarship: () => setSelectedScholarship(content.notifications.scholarship),
    competition: () => setSelectedCompetition(content.notifications.competition),
    lesson: () => navigate(COURSE_PLAYER_ROUTE('course-1')),
    exam: () => navigate(COURSE_CERTIFICATE_ROUTE('course-1')),
  };

  const handleNotificationAction = (notif: NotificationItemData) => notificationActions[notif.type]();

  const value: DashboardContextValue = {
    currentView,
    isLive,
    isEmpty,
    isSavedView,
    header,
    statChips,
    unreadCount,
    coursesData,
    isLoadingCourses,
    activeWorkspaceCourse,
    isLiveClassroomOpen,
    selectedScholarship,
    selectedCompetition,
    previewCertificateItem,
    selectView,
    openWorkspace: setActiveWorkspaceCourse,
    openLiveClassroom: () => setIsLiveClassroomOpen(true),
    selectScholarship: setSelectedScholarship,
    selectCompetition: setSelectedCompetition,
    previewCertificate: setPreviewCertificateItem,
    closeWorkspace: () => setActiveWorkspaceCourse(null),
    closeLiveClassroom: () => setIsLiveClassroomOpen(false),
    closeScholarship: () => setSelectedScholarship(null),
    closeCompetition: () => setSelectedCompetition(null),
    closeCertificate: () => setPreviewCertificateItem(null),
    handleNotificationAction,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};
