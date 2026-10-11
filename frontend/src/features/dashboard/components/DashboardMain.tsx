import React from 'react';
import { BookOpen, User } from 'lucide-react';
import { DataSectionSkeleton } from '../../../shared/components/Loading/DataSectionSkeleton';
import {
  CHALLENGE_ITEM,
  FULL_PAGE_VIEWS,
  SINGLE_COLUMN_VIEWS,
  SPOTLIGHT,
  SUB_NAV_VIEWS,
  UNREAD_COUNT,
  useDashboard,
} from '../context/dashboardContext';
import { DashboardTopBar } from './DashboardTopBar';
import { MobileDashboardTopBar } from './MobileDashboardTopBar';
import { DashboardStatsHeader, DashboardMobileChips } from './DashboardStatsHeader';
import { NotificationsView } from './NotificationsView';
import { EmptyDashboardState } from './EmptyDashboardState';
import { ProfileView } from '../../profile/components/ProfileView';
import { EnrolledCoursesView } from './EnrolledCoursesView';
import { SavedScholarshipsView } from './SavedScholarshipsView';
import { CompetitionsCertificatesView } from './CompetitionsCertificatesView';
import { DashboardSubNavigation } from './DashboardSubNavigation';
import { DashboardStatsSidebar } from './DashboardStatsSidebar';
import { ChallengeSpotlightCard } from './ChallengeSpotlightCard';
import { PriorityContinueCard } from './PriorityContinueCard';
import { LiveSessionPriorityCard } from './LiveSessionPriorityCard';
import { EnrolledCourseRow } from './EnrolledCourseRow';

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

/** The single responsive dash-main body: headers, mobile chrome, and view sections. */
export const DashboardMain: React.FC = () => {
  const {
    currentView,
    isLive,
    isEmpty,
    isSavedView,
    header,
    statChips,
    coursesData,
    isLoadingCourses,
    selectView,
    openWorkspace,
    openLiveClassroom,
    selectScholarship,
    selectCompetition,
    previewCertificate,
    handleNotificationAction,
  } = useDashboard();

  return (
    // Main body, second child in RTL so it fills the left
    <div className="dash-main">
      {/* Top-bar matching Figma desktop (search on right, nav links on left) */}
      <DashboardTopBar />

      {/* Inner padding container */}
      <div className="dash-container">
        {/* Stats & greeting header for the grid views */}
        {!isEmpty && !FULL_PAGE_VIEWS.includes(currentView) && (
          <div className="animate-fade-in-up">
            <DashboardStatsHeader
              title={header.title}
              subtitle={header.subtitle}
              chips={statChips}
              studentName="أحمد"
              unreadNotificationsCount={UNREAD_COUNT}
              onNotificationsClick={() => selectView('notifications')}
              onAvatarClick={() => selectView('profile')}
              onSavedClick={() => selectView('saved')}
              isSavedActive={isSavedView}
            />
          </div>
        )}

        {/* Notifications view owns its back-button header */}
        {currentView === 'notifications' && (
          <div className="w-full max-w-4xl mx-auto py-2 animate-fade-in-up">
            <NotificationsView
              onBack={() => selectView('main')}
              onSelectNotification={handleNotificationAction}
            />
          </div>
        )}

        {/* Mobile top bars for the dedicated views */}
        {isEmpty && (
          <MobileDashboardTopBar
            title={
              <MobileTitle
                label="مرحبًا، سارة"
                avatar={<User size={18} className="text-blue-400" />}
              />
            }
            onNotificationsClick={() => selectView('notifications')}
            onSavedClick={() => selectView('saved')}
            isSavedActive={isSavedView}
          />
        )}

        {currentView === 'profile' && (
          <MobileDashboardTopBar
            title={
              <MobileTitle
                label="الملف الشخصي"
                avatar={<span className="text-gold-400 text-xs font-bold font-display">أق</span>}
                avatarClassName="size-8.5 border-gold-400"
                labelClassName="text-white text-base"
              />
            }
            onNotificationsClick={() => selectView('notifications')}
            onSavedClick={() => selectView('saved')}
            isSavedActive={isSavedView}
          />
        )}

        {currentView === 'enrolled' && !isEmpty && (
          <MobileDashboardTopBar
            title={
              <MobileTitle
                label="الدورات المسجّلة"
                avatar={<BookOpen size={18} className="text-blue-400" />}
              />
            }
            onNotificationsClick={() => selectView('notifications')}
            onSavedClick={() => selectView('saved')}
            isSavedActive={isSavedView}
          />
        )}

        {/* Single mobile sub-nav, pinned so the active tab never shifts between views */}
        {!isEmpty && SUB_NAV_VIEWS.includes(currentView) && (
          <div className="dash-subnav-bar">
            <DashboardSubNavigation activeView={currentView} onSelectView={selectView} />
          </div>
        )}

        {/* Mobile reminder chips sit under the tab strip, so the strip keeps its place */}
        {!isEmpty && !FULL_PAGE_VIEWS.includes(currentView) && <DashboardMobileChips chips={statChips} />}

        {/* Empty state view */}
        {isEmpty && (
          <div className="w-full py-2 md:py-6 animate-fade-in-up animation-delay-100">
            <EmptyDashboardState userName="سارة" />
          </div>
        )}

        {/* Profile view (حسابي) */}
        {currentView === 'profile' && (
          <div className="w-full py-1 md:py-2 animate-fade-in-up animation-delay-100">
            <ProfileView />
          </div>
        )}

        {/* Enrolled courses dedicated view (الدورات المسجّلة) */}
        {currentView === 'enrolled' && !isEmpty && (
          <div className="w-full py-1 md:py-2 animate-fade-in-up animation-delay-100">
            <EnrolledCoursesView
              onResumeCourse={(course) => openWorkspace(course.title)}
              onViewCertificate={(course) =>
                previewCertificate({
                  id: `cert-${course.id}`,
                  title: `شهادة إتمام: ${course.title}`,
                  issueDate: course.completionDate || '14 سبتمبر 2026',
                  credentialId: `KHW-${course.id.toUpperCase()}-2026`,
                  isOfficial: true,
                })
              }
              onJoinLive={openLiveClassroom}
            />
          </div>
        )}

        {/* Two-column grid for main, live, saved, achievements views */}
        {!isEmpty && !SINGLE_COLUMN_VIEWS.includes(currentView) && (
          <div className="dash-grid animate-fade-in-up animation-delay-100">
            {/* Primary column (center) */}
            <div className="dash-grid-main">
              {/* Main / live view */}
              {currentView === 'main' && (
                <>
                  {/* Hero cards: live session dominates, otherwise the
                      challenge spotlight and the continue-learning card */}
                  {isLive ? (
                    <LiveSessionPriorityCard onJoinSession={openLiveClassroom} />
                  ) : (
                    <>
                      {SPOTLIGHT.hasChallenge && (
                        <ChallengeSpotlightCard onEnter={() => selectCompetition(CHALLENGE_ITEM)} />
                      )}
                      {SPOTLIGHT.hasCourse && (
                        <PriorityContinueCard
                          onContinue={() => openWorkspace('أساسيات الذكاء الاصطناعي وتعلم الآلة')}
                        />
                      )}
                    </>
                  )}

                  {/* Courses section */}
                  <div className="dash-section">
                    <div className="dash-section-head">
                      <div className="section-accent-title-blue">
                        <h2 className="dash-view-title">{isLive ? 'بقية دوراتك لليوم' : 'دوراتي الحالية'}</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => selectView('enrolled')}
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
                        coursesData.map((course, idx) => (
                          <EnrolledCourseRow
                            key={course.id}
                            index={idx}
                            course={course}
                            onContinue={() => openWorkspace(course.title)}
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
                  onSelectScholarship={(sch) => selectScholarship(sch)}
                  onSelectCourse={() => openWorkspace('الدورة المحفوظة')}
                />
              )}

              {/* Competitions & certificates view */}
              {currentView === 'achievements' && (
                <CompetitionsCertificatesView
                  onOpenArena={(comp) => selectCompetition(comp)}
                  onPreviewCertificate={(cert) => previewCertificate(cert)}
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
  );
};