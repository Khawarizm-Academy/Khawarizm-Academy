import React, { useState } from 'react';
import { useSearchParams, useNavigate } from '../../../app/routerContext';
import type { DashboardView, DashboardState } from '../types';
import {
  mockEnrolledCourses,
  mockPriorityContinueCourse,
  mockImminentLiveSession,
  mockDashboardStats,
  mockUpcomingEvents,
} from '../data/mockDashboardData';
import { DashboardQuickSummary } from '../components/DashboardQuickSummary';
import { DashboardTabFilter } from '../components/DashboardTabFilter';
import { PriorityContinueCard } from '../components/PriorityContinueCard';
import { LiveSessionPriorityCard } from '../components/LiveSessionPriorityCard';
import { EmptyDashboardState } from '../components/EmptyDashboardState';
import { EnrolledCourseRow } from '../components/EnrolledCourseRow';
import { DashboardStatsSidebar } from '../components/DashboardStatsSidebar';
import { SavedScholarshipsView } from '../components/SavedScholarshipsView';
import { CompetitionsCertificatesView } from '../components/CompetitionsCertificatesView';
import { NotificationsDrawer } from '../components/NotificationsDrawer';

export const DashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 1. Derive view and state directly from URL (Single Source of Truth)
  const currentView = (searchParams.get('view') as DashboardView) || 'overview';
  const currentState = (searchParams.get('state') as DashboardState) || 'active';

  // 2. Notifications overlay state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleViewChange = (newView: DashboardView) => {
    setSearchParams({
      view: newView,
      state: currentState,
    });
  };

  const handleStateChange = (newState: DashboardState) => {
    setSearchParams({
      view: currentView,
      state: newState,
    });
  };

  const userName = currentState === 'empty' ? 'سارة' : 'أحمد';

  return (
    <main className="content-container animate-page-enter pb-24 md:pb-16">
      {/* 1. Page Header & Greeting */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge-gold">لوحة الطالب الأكاديمية</span>
            {currentState === 'live' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B6B] bg-[#FF4D4D]/15 px-2.5 py-0.5 rounded-full">
                <span className="size-1.5 rounded-full bg-[#FF4D4D] animate-ping" />
                فصل افتراضي مباشر
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Cairo',sans-serif] text-[#F1F5F9]">
            مرحبًا، {userName}
          </h1>
          <p className="text-xs sm:text-sm text-[#8299B5] font-['Tajawal',sans-serif] mt-1">
            {currentState === 'empty'
              ? 'لوحتك التعليمية جاهزة. استكشف برامج ودورات الأكاديمية وابدأ التعلم الآن.'
              : 'لديك تقدم استثنائي اليوم. تابع مسارك الدراسي وتحدياتك القادمة.'}
          </p>
        </div>

        {/* Header Action: Open Notifications Center */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="btn-pill-subtle flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold font-['Tajawal'] text-[#DCE5EE] hover:border-[#29A9FF]/60 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
          >
            <div className="relative">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[#FF4D4D] ring-2 ring-[#061A3A]" />
            </div>
            <span>مركز الإشعارات</span>
          </button>
        </div>
      </section>

      {/* 2. Top Summary Strip (always visible per UX spec §3) */}
      <section className="mb-2">
        <DashboardQuickSummary
          activeCoursesCount={currentState === 'empty' ? 0 : 3}
          closingScholarshipsCount={2}
          registeredCompetitionsCount={1}
          earnedCertificatesCount={6}
          onChipClick={(type) => {
            if (type === 'scholarships') handleViewChange('saved');
            else if (type === 'competitions' || type === 'certificates') handleViewChange('achievements');
            else handleViewChange('overview');
          }}
        />
      </section>

      {/* 3. Sub-Navigation Switcher & Interactive State Simulator */}
      <section>
        <DashboardTabFilter
          currentView={currentView}
          currentState={currentState}
          onViewChange={handleViewChange}
          onStateChange={handleStateChange}
        />
      </section>

      {/* 4. Dynamic Views Rendering */}
      {currentView === 'saved' && (
        <SavedScholarshipsView onExploreMore={() => navigate('/catalog?type=scholarships')} />
      )}

      {currentView === 'achievements' && <CompetitionsCertificatesView />}

      {currentView === 'overview' && (
        <>
          {/* Case 1: Empty First-Time State */}
          {currentState === 'empty' ? (
            <section className="py-6">
              <EmptyDashboardState
                userName={userName}
                onExploreCourses={() => navigate('/catalog?type=courses')}
                onExploreScholarships={() => navigate('/catalog?type=scholarships')}
              />
            </section>
          ) : (
            /* Case 2: Active / Live 2-Column Responsive Layout */
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Main Column (8 cols in 12-col grid) */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                {/* Priority Slot (Continue Now) */}
                {currentState === 'live' ? (
                  <LiveSessionPriorityCard
                    session={mockImminentLiveSession}
                    onJoin={() => {
                      if (mockImminentLiveSession.meetUrl) {
                        window.open(mockImminentLiveSession.meetUrl, '_blank');
                      }
                    }}
                  />
                ) : (
                  <PriorityContinueCard
                    course={mockPriorityContinueCourse}
                    onResume={() => navigate('/courses/ai-machine-learning')}
                  />
                )}

                {/* Enrolled Courses Rail ("دوراتي الحالية") */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold font-['Cairo',sans-serif] text-[#F1F5F9]">
                      دوراتي الحالية
                    </h2>
                    <button
                      onClick={() => navigate('/catalog?type=courses')}
                      className="text-xs sm:text-sm font-bold text-[#29A9FF] hover:text-[#E5B65C] font-['Tajawal'] transition-colors cursor-pointer"
                    >
                      عرض الكل
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {mockEnrolledCourses.map((course) => (
                      <EnrolledCourseRow
                        key={course.id}
                        course={course}
                        onResume={(courseId) => {
                          const slug = courseId.replace('course-', '');
                          navigate(`/courses/${slug}`);
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Mobile-Only Collapsible Stats and Events */}
                <div className="block lg:hidden mt-2">
                  <DashboardStatsSidebar
                    stats={mockDashboardStats}
                    events={mockUpcomingEvents}
                  />
                </div>
              </div>

              {/* Sidebar Column (4 cols in 12-col grid, desktop only) */}
              <div className="hidden lg:block lg:col-span-4 sticky top-24">
                <DashboardStatsSidebar
                  stats={mockDashboardStats}
                  events={mockUpcomingEvents}
                />
              </div>
            </section>
          )}
        </>
      )}

      {/* 5. Notifications Drawer / Modal */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={(path) => navigate(path)}
      />
    </main>
  );
};