import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { getDashboardNavItem } from '@/shared/lib/navigation';
import { fetchEnrolledCourses } from '@/features/dashboard/data/dashboardFetchers';
import notificationJson from '@/shared/json/dashboardNotifications.json';
import { DashboardContext, LIVE_COURSE, VIEW_HEADERS } from '@/features/dashboard/context/dashboardContext';
import type { DashboardContextValue, ViewChip } from '@/features/dashboard/context/dashboardContext';
import type { EnrolledCourse } from '@/features/dashboard/types';
import type { StatChipItem } from '@/features/dashboard/components/chrome/DashboardStatsHeader';
import type { SavedScholarshipItem } from '@/features/dashboard/components/views/SavedScholarshipsView';
import type { CompetitionItem, CertificateItem } from '@/features/dashboard/components/views/CompetitionsCertificatesView';
import type { NotificationItemData } from '@/features/dashboard/components/views/NotificationsView';

/** Owns every piece of dashboard state so all chrome reads one source. */
export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { search } = useLocation();
  const navigate = useNavigate();

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

  const chamberActions: Record<string, () => void> = {
    live: () => setIsLiveClassroomOpen(true),
    course: () => setActiveWorkspaceCourse(LIVE_COURSE),
  };

  // A chip opens a view or a chamber, and some chips are labels only.
  const openChip = ({ view, action }: ViewChip) => {
    if (action) return chamberActions[action];
    if (view) return () => selectView(view);
    return undefined;
  };

  const header = VIEW_HEADERS[isLive ? 'live' : currentView] ?? VIEW_HEADERS.main;
  const statChips: StatChipItem[] = (header.chips ?? VIEW_HEADERS.main.chips ?? []).map((chip) => ({
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

  // Every notification opens the chamber its type points to.
  const notificationActions: Record<NotificationItemData['type'], () => void> = {
    live: () => setIsLiveClassroomOpen(true),
    scholarship: () => setSelectedScholarship(notificationJson.scholarship as SavedScholarshipItem),
    competition: () => setSelectedCompetition(notificationJson.competition as CompetitionItem),
    lesson: () => setActiveWorkspaceCourse(notificationJson.lesson.title),
    exam: () => setActiveWorkspaceCourse(notificationJson.exam.title),
  };

  const handleNotificationAction = (notif: NotificationItemData) => notificationActions[notif.type]();

  const value: DashboardContextValue = {
    currentView,
    isLive,
    isEmpty,
    isSavedView,
    header,
    statChips,
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