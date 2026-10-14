import React from 'react';
import { BookOpen, User } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import {
  CATALOG_COURSES_ROUTE,
  COURSE_CERTIFICATE_ROUTE,
  COURSE_PLAYER_ROUTE,
} from '@/shared/lib/navigation';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import type { EnrolledCourse } from '@/features/dashboard/types';
import { SUB_NAV_VIEWS, useDashboard } from '@/features/dashboard/context/dashboardContext';
import { useDashboardContent } from '@/features/dashboard/context/DashboardContentContext';
import { DashboardTopBar } from '@/features/dashboard/components/chrome/DashboardTopBar';
import { MobileDashboardTopBar } from '@/features/dashboard/components/chrome/MobileDashboardTopBar';
import { DashboardStatsHeader, DashboardMobileChips } from '@/features/dashboard/components/chrome/DashboardStatsHeader';
import { NotificationsView } from '@/features/dashboard/components/views/NotificationsView';
import { EmptyDashboardState } from '@/features/dashboard/components/states/EmptyDashboardState';
import { DashboardSectionEmpty } from '@/features/dashboard/components/states/DashboardSectionEmpty';
import { ProfileView } from '@/features/profile/components/layout/ProfileView';
import { EnrolledCoursesView } from '@/features/dashboard/components/views/EnrolledCoursesView';
import { SavedScholarshipsView } from '@/features/dashboard/components/views/SavedScholarshipsView';
import { CompetitionsCertificatesView } from '@/features/dashboard/components/views/CompetitionsCertificatesView';
import { DashboardSubNavigation } from '@/features/dashboard/components/chrome/DashboardSubNavigation';
import { DashboardStatsSidebar } from '@/features/dashboard/components/chrome/DashboardStatsSidebar';
import { EnrolledCourseRow } from '@/features/dashboard/components/cards/EnrolledCourseRow';

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
  const navigate = useNavigate();
  const { content } = useDashboardContent();
  const { fullPageViews, singleColumnViews } = content.views;
  const {
    currentView,
    isLive,
    isEmpty,
    isSavedView,
    header,
    statChips,
    unreadCount,
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

  /** Resume jumps straight into the real Course Player; mock-only rows keep the workspace chamber. */
  const resumeCourse = (course: EnrolledCourse) => {
    if (course.slug) navigate(COURSE_PLAYER_ROUTE(course.slug));
    else openWorkspace(course.title);
  };

  /** Completed courses open the real certificate page; mock-only ones use the preview chamber. */
  const viewCourseCertificate = (course: EnrolledCourse) => {
    if (course.slug) navigate(COURSE_CERTIFICATE_ROUTE(course.slug));
    else
      previewCertificate({
        id: `cert-${course.id}`,
        title: `شهادة إتمام: ${course.title}`,
        issueDate: course.completionDate || '14 سبتمبر 2026',
        credentialId: `KHW-${course.id.toUpperCase()}-2026`,
        isOfficial: true,
      });
  };

  return (
    // Main body, second child in RTL so it fills the left
    <div className="dash-main">
      {/* Top-bar matching Figma desktop (search on right, nav links on left) */}
      <DashboardTopBar />

      {/* Inner padding container */}
      <div className="dash-container">
        {/* Stats & greeting header for the grid views */}
        {!isEmpty && !fullPageViews.includes(currentView) && (
          <div className="animate-fade-in-up">
            <DashboardStatsHeader
              title={header.title}
              subtitle={header.subtitle}
              chips={statChips}
              studentName="أحمد"
              unreadNotificationsCount={unreadCount}
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
        {!isEmpty && !fullPageViews.includes(currentView) && <DashboardMobileChips chips={statChips} />}

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
              onResumeCourse={resumeCourse}
              onViewCertificate={viewCourseCertificate}
              onJoinLive={openLiveClassroom}
            />
          </div>
        )}

        {/* Two-column grid for main, live, saved, achievements views */}
        {!isEmpty && !singleColumnViews.includes(currentView) && (
          <div className="dash-grid animate-fade-in-up animation-delay-100">
            {/* Primary column (center) */}
            <div className="dash-grid-main">
              {/* Main / live view */}
              {currentView === 'main' && (
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

                  {/* Courses list, or its empty state */}
                  {isLoadingCourses ? (
                    <DataSectionSkeleton variant="list" count={3} />
                  ) : coursesData.length === 0 ? (
                    <DashboardSectionEmpty
                      icon={<BookOpen size={28} className="text-blue-400" />}
                      title="لا توجد دورات مسجّلة بعد"
                      text="استكشفي الدورات المميزة وابدئي مسارك التعليمي الأول."
                      action={
                        <button
                          type="button"
                          onClick={() => navigate(CATALOG_COURSES_ROUTE)}
                          className="dash-cta-blue"
                        >
                          استكشاف الدورات
                        </button>
                      }
                    />
                  ) : (
                    <div className="dash-list">
                      {coursesData.map((course, idx) => (
                        <EnrolledCourseRow
                          key={course.id}
                          index={idx}
                          course={course}
                          onContinue={() => resumeCourse(course)}
                        />
                      ))}
                    </div>
                  )}
                </div>
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