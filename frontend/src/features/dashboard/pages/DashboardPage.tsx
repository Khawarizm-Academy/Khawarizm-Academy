import React, { useMemo, useState } from 'react';
import { BookOpen, User, type LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from '../../../app/routerContext';
import { useCachedData } from '../../../shared/hooks/useCachedData';
import { DataSectionSkeleton } from '../../../shared/components/Loading/DataSectionSkeleton';
import { fetchEnrolledCourses } from '../data/dashboardFetchers';
import type { EnrolledCourse } from '../types';
import { DesktopDashboardSidebar } from '../components/DesktopDashboardSidebar';
import { DashboardTopBar } from '../components/DashboardTopBar';
import { MobileDashboardTopBar } from '../components/MobileDashboardTopBar';
import { CertificatePreviewModal } from '../components/CertificatePreviewModal';
import { DashboardStatsHeader, type StatChipItem } from '../components/DashboardStatsHeader';
import { PriorityContinueCard } from '../components/PriorityContinueCard';
import { LiveSessionPriorityCard } from '../components/LiveSessionPriorityCard';
import { EmptyDashboardState } from '../components/EmptyDashboardState';
import { EnrolledCourseRow } from '../components/EnrolledCourseRow';
import { DashboardStatsSidebar } from '../components/DashboardStatsSidebar';
import { SavedScholarshipsView, type SavedScholarshipItem } from '../components/SavedScholarshipsView';
import { CompetitionsCertificatesView, type CompetitionItem, type CertificateItem } from '../components/CompetitionsCertificatesView';
import { NotificationsView, type NotificationItemData } from '../components/NotificationsView';
import { ProfileView } from '../../profile/components/ProfileView';
import { CourseWorkspaceModal } from '../components/CourseWorkspaceModal';
import { LiveClassroomModal } from '../components/LiveClassroomModal';
import { ScholarshipApplicationModal } from '../components/ScholarshipApplicationModal';
import { CompetitionArenaModal } from '../components/CompetitionArenaModal';
import { DashboardSubNavigation } from '../components/DashboardSubNavigation';
import { EnrolledCoursesView } from '../components/EnrolledCoursesView';
import { getDashboardNavItem, resolveIcon } from '../../../shared/lib/navigation';
import dashboardViewsJson from '../../../shared/json/dashboardViews.json';
import notificationJson from '../../../shared/json/dashboardNotifications.json';

const LIVE_COURSE = dashboardViewsJson.liveCard.courseTitle;
const FULL_PAGE_VIEWS = dashboardViewsJson.fullPageViews;
const SINGLE_COLUMN_VIEWS = dashboardViewsJson.singleColumnViews;

/** Mock unread badge shared by every bell in the dashboard chrome. */
const UNREAD_COUNT = 5;

interface ViewChip {
  icon: LucideIcon;
  label: string;
  iconColor: string;
  view?: string; // dashboard view to open
  action?: 'live' | 'course'; // in-dashboard chamber to open
}

interface ViewHeader {
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
const VIEW_HEADERS: Record<string, ViewHeader> = Object.fromEntries(
  Object.entries(RAW_VIEW_HEADERS).map(([key, header]) => [
    key,
    { ...header, chips: header.chips?.map((chip) => ({ ...chip, icon: resolveIcon(chip.icon) })) },
  ])
);

/** Mobile top-bar title: rounded avatar + heading, shared by the dedicated views. */
const MobileTitle = ({
  label,
  avatar,
  avatarClassName = '',
  labelClassName = '',
}: {
  label: string;
  avatar: React.ReactNode;
  avatarClassName?: string;
  labelClassName?: string;
}) => (
  <div className="dash-mtop-title">
    <div className={`dash-avatar shadow-sm ${avatarClassName}`}>{avatar}</div>
    <span className={`dash-mtop-label ${labelClassName}`}>{label}</span>
  </div>
);

export const DashboardPage: React.FC = () => {
  const { search } = useLocation();
  const navigate = useNavigate();

  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const viewParam = queryParams.get('view') || 'main';
  const stateParam = queryParams.get('state'); // 'live' | 'empty' | undefined

  // One canonical id per view, so aliases like ?view=courses need no checks below.
  const currentView = getDashboardNavItem(viewParam)?.id ?? viewParam;
  const isLive = stateParam === 'live' || viewParam === 'live';
  const isEmpty = stateParam === 'empty' || viewParam === 'empty';

  // In-dashboard self-contained modal chambers.
  const [activeWorkspaceCourse, setActiveWorkspaceCourse] = useState<string | null>(null);
  const [isLiveClassroomOpen, setIsLiveClassroomOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<SavedScholarshipItem | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<CompetitionItem | null>(null);
  const [previewCertificate, setPreviewCertificate] = useState<CertificateItem | null>(null);

  const handleSelectView = (viewId: string) => {
    navigate(`/dashboard?view=${viewId}`);
  };

  const chamberActions: Record<string, () => void> = {
    live: () => setIsLiveClassroomOpen(true),
    course: () => setActiveWorkspaceCourse(LIVE_COURSE),
  };

  // A chip opens a view or a chamber, and some chips are labels only.
  const openChip = ({ view, action }: ViewChip) => {
    if (action) return chamberActions[action];
    if (view) return () => handleSelectView(view);
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

  const handleNotificationAction = (notif: NotificationItemData) =>
    notificationActions[notif.type]();

  return (
    <div dir="rtl" className="dash-page">
      {/* Sidebar first, so RTL puts it on the far right */}
      <DesktopDashboardSidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        unreadNotificationsCount={UNREAD_COUNT}
      />

      {/* Main body, second child in RTL so it fills the left */}
      <div className="dash-main">
        {/* Top-bar matching Figma desktop (search on right, nav links on left) */}
        <DashboardTopBar />

        {/* Inner padding container */}
        <div className="dash-container">
          {/* Stats & greeting header */}
          {!isEmpty && !FULL_PAGE_VIEWS.includes(currentView) && (
            <div className="animate-fade-in-up">
              <DashboardStatsHeader
                title={header.title}
                subtitle={header.subtitle}
                chips={statChips}
                studentName="أحمد"
                unreadNotificationsCount={UNREAD_COUNT}
                onNotificationsClick={() => handleSelectView('notifications')}
                onAvatarClick={() => handleSelectView('profile')}
              />
            </div>
          )}

          {/* Empty state view */}
          {isEmpty && (
            <>
              <MobileDashboardTopBar
                title={
                  <MobileTitle
                    label="مرحبًا، سارة"
                    avatar={<User size={18} className="text-blue-400" />}
                  />
                }
                onNotificationsClick={() => handleSelectView('notifications')}
              />
              <div className="w-full py-2 md:py-6 animate-fade-in-up animation-delay-100">
                <EmptyDashboardState userName="سارة" />
              </div>
            </>
          )}

          {/* Notifications view */}
          {currentView === 'notifications' && (
            <div className="w-full max-w-4xl mx-auto py-2 animate-fade-in-up">
              <NotificationsView
                onBack={() => handleSelectView('main')}
                onSelectNotification={handleNotificationAction}
              />
            </div>
          )}

          {/* Profile view (حسابي) */}
          {currentView === 'profile' && (
            <>
              <MobileDashboardTopBar
                title={
                  <MobileTitle
                    label="الملف الشخصي"
                    avatar={<span className="text-gold-400 text-xs font-bold font-display">أق</span>}
                    avatarClassName="size-8.5 border-gold-400"
                    labelClassName="text-white text-base"
                  />
                }
                onNotificationsClick={() => handleSelectView('notifications')}
              />
              <div className="w-full flex flex-col gap-6 py-1 md:py-2 animate-fade-in-up animation-delay-100">
                <DashboardSubNavigation activeView="profile" onSelectView={handleSelectView} />
                <ProfileView />
              </div>
            </>
          )}

          {/* Enrolled courses dedicated view (الدورات المسجّلة) */}
          {currentView === 'enrolled' && !isEmpty && (
            <>
              <MobileDashboardTopBar
                title={
                  <MobileTitle
                    label="الدورات المسجّلة"
                    avatar={<BookOpen size={18} className="text-blue-400" />}
                  />
                }
                onNotificationsClick={() => handleSelectView('notifications')}
              />
              <div className="w-full py-1 md:py-2 animate-fade-in-up animation-delay-100">
                <EnrolledCoursesView
                  onSelectView={handleSelectView}
                  onResumeCourse={(course) => setActiveWorkspaceCourse(course.title)}
                  onViewCertificate={(course) =>
                    setPreviewCertificate({
                      id: `cert-${course.id}`,
                      title: `شهادة إتمام: ${course.title}`,
                      issueDate: course.completionDate || '14 سبتمبر 2026',
                      credentialId: `KHW-${course.id.toUpperCase()}-2026`,
                      isOfficial: true,
                    })
                  }
                  onJoinLive={() => setIsLiveClassroomOpen(true)}
                />
              </div>
            </>
          )}

          {/* Two-column grid for main, live, saved, achievements views */}
          {!isEmpty && !SINGLE_COLUMN_VIEWS.includes(currentView) && (
            <div className="dash-grid animate-fade-in-up animation-delay-100">
              {/* Primary column (center) */}
              <div className="dash-grid-main">
                {/* Main / live view */}
                {currentView === 'main' && (
                  <>
                    {/* Sub-navigation strip */}
                    <DashboardSubNavigation
                      activeView={currentView}
                      onSelectView={handleSelectView}
                    />

                    {/* Hero card: live session or priority continue */}
                    {isLive ? (
                      <LiveSessionPriorityCard
                        onJoinSession={() => setIsLiveClassroomOpen(true)}
                      />
                    ) : (
                      <PriorityContinueCard
                        onContinue={() =>
                          setActiveWorkspaceCourse('أساسيات الذكاء الاصطناعي وتعلم الآلة')
                        }
                      />
                    )}

                    {/* Courses section */}
                    <div className="dash-section">
                      <div className="dash-section-head">
                        <div className="section-accent-title-blue">
                          <h2 className="dash-view-title">
                            {isLive ? 'بقية دوراتك لليوم' : 'دوراتي الحالية'}
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectView('enrolled')}
                          className="dash-section-link"
                        >
                          عرض الكل
                        </button>
                      </div>

                      {/* Courses list */}
                      <div className="dash-list">
                        {isLoadingCourses ? (
                          <DataSectionSkeleton variant="list" count={3} />
                        ) : (
                          coursesData.map((course) => (
                            <EnrolledCourseRow
                              key={course.id}
                              course={course}
                              onContinue={() => setActiveWorkspaceCourse(course.title)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Saved scholarships & favorites view */}
                {currentView === 'saved' && (
                  <SavedScholarshipsView
                    onSelectScholarship={(sch) => setSelectedScholarship(sch)}
                    onSelectCourse={() => setActiveWorkspaceCourse('الدورة المحفوظة')}
                  />
                )}

                {/* Competitions & certificates view */}
                {currentView === 'achievements' && (
                  <CompetitionsCertificatesView
                    onOpenArena={(comp) => setSelectedCompetition(comp)}
                    onPreviewCertificate={(cert) => setPreviewCertificate(cert)}
                  />
                )}
              </div>

              {/* Sidebar widgets column (left side in RTL desktop) */}
              <div className="dash-grid-aside">
                <DashboardStatsSidebar />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* In-dashboard chambers, no page change */}
      <CourseWorkspaceModal
        isOpen={!!activeWorkspaceCourse}
        onClose={() => setActiveWorkspaceCourse(null)}
        courseTitle={activeWorkspaceCourse || undefined}
      />

      {/* Live classroom */}
      <LiveClassroomModal
        isOpen={isLiveClassroomOpen}
        onClose={() => setIsLiveClassroomOpen(false)}
      />

      {/* Scholarship application */}
      <ScholarshipApplicationModal
        isOpen={!!selectedScholarship}
        onClose={() => setSelectedScholarship(null)}
        scholarship={selectedScholarship}
      />

      {/* Competition arena */}
      <CompetitionArenaModal
        isOpen={!!selectedCompetition}
        onClose={() => setSelectedCompetition(null)}
        competition={selectedCompetition}
      />

      {/* Certificate preview */}
      {previewCertificate && (
        <CertificatePreviewModal
          certificate={previewCertificate}
          onClose={() => setPreviewCertificate(null)}
        />
      )}
    </div>
  );
};
