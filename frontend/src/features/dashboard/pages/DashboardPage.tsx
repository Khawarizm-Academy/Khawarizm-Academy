import React, { useMemo } from 'react';
import { useLocation, useNavigate } from '../../../app/routerContext';
import { DesktopDashboardSidebar } from '../components/DesktopDashboardSidebar';
import { DashboardTopBar } from '../components/DashboardTopBar';
import { DashboardStatsHeader, type StatChipItem } from '../components/DashboardStatsHeader';
import { PriorityContinueCard } from '../components/PriorityContinueCard';
import { LiveSessionPriorityCard } from '../components/LiveSessionPriorityCard';
import { EmptyDashboardState } from '../components/EmptyDashboardState';
import { EnrolledCourseRow } from '../components/EnrolledCourseRow';
import { DashboardStatsSidebar } from '../components/DashboardStatsSidebar';
import { SavedScholarshipsView } from '../components/SavedScholarshipsView';
import { CompetitionsCertificatesView } from '../components/CompetitionsCertificatesView';
import { NotificationsView } from '../components/NotificationsView';

export const DashboardPage: React.FC = () => {
  const { search } = useLocation();
  const navigate = useNavigate();

  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const viewParam = queryParams.get('view') || 'main';
  const stateParam = queryParams.get('state'); // 'live' | 'empty' | undefined

  // Determine current active view
  const currentView = viewParam;

  const handleSelectView = (viewId: string) => {
    navigate(`/dashboard?view=${viewId}`);
  };

  // Header content and stat chips based on view
  let headerTitle = 'مرحبًا، أحمد';
  let headerSubtitle = 'لديك تقدم مميز اليوم. تابع إنجازك الدراسي!';
  let statChips: StatChipItem[] = [
    { icon: '📚', label: '3 دورات نشطة ومسجلة' },
    { icon: '🎓', label: 'منحتان دراسيتان قريبتا الانتهاء' },
    { icon: '🏆', label: 'مسابقة ذكاء اصطناعي مسجّل بها' },
  ];

  if (stateParam === 'live' || currentView === 'live') {
    headerTitle = 'الجلسات المباشرة';
    headerSubtitle = 'انضم للفصول الافتراضية التفاعلية مع المعلمين';
  } else if (currentView === 'saved') {
    headerTitle = 'لوحتي المحفوظة';
    headerSubtitle = 'تابع المنح الدراسية والدورات المفضلة والتقديمات القادمة';
    statChips = [
      { icon: '🏆', label: 'برامج ابتعاث تفاعلية' },
      { icon: '🎓', label: '4 منح محفوظات حاليًا' },
      { icon: '📚', label: 'مستندات جاهزة للتقديم' },
    ];
  } else if (currentView === 'achievements') {
    headerTitle = 'إنجازاتي وتحدياتي';
    headerSubtitle = 'سجل التحديات البرمجية والشهادات الرسمية المعتمدة';
    statChips = [
      { icon: '🏆', label: '3 تحديات نشطة' },
      { icon: '🏅', label: '6 شهادات موثقة' },
    ];
  } else if (currentView === 'notifications') {
    headerTitle = 'مركز الإشعارات';
    headerSubtitle = 'لديك 3 تنبيهات جديدة غير مقروءة';
  }

  // Course rows for main / live views
  const enrolledCourses = [
    {
      id: 'course-uiux',
      title: 'تصميم واجهات المستخدم UI/UX للمتقدمين',
      category: 'مسار التصميم والابتكار',
      progressPercent: 75,
      iconType: 'uiux' as const,
    },
    {
      id: 'course-python',
      title: 'برمجة بايثون للمبتدئين',
      category: 'مسار البرمجة والتطوير',
      progressPercent: 20,
      iconType: 'python' as const,
    },
    {
      id: 'course-ai',
      title: 'أساسيات الذكاء الاصطناعي وتطبيقاته',
      category: 'مسار التقنيات الناشئة',
      progressPercent: 40,
      iconType: 'ai' as const,
    },
  ];

  return (
    <div
      dir="rtl"
      data-layer="dashboard-main-desktop"
      className="DashboardMainDesktop w-full min-h-screen bg-slate-900 flex justify-start items-start text-slate-100 selection:bg-sky-500/20 selection:text-sky-300 relative overflow-x-hidden"
    >
      {/* Ambient background glows matching Figma */}
      <div className="size-[600px] -left-[200px] top-[400px] absolute bg-radial from-sky-400/5 to-transparent pointer-events-none" />
      <div className="size-[600px] left-[800px] top-[800px] absolute bg-radial from-orange-300/5 to-transparent pointer-events-none" />

      {/* 1. Main Content Area (Left side in LTR, fills screen next to right sidebar) */}
      <div
        data-layer="Main-Body"
        className="MainBody flex-1 min-w-0 flex flex-col justify-start items-start"
      >
        {/* Top-Bar matching Figma desktop (hidden on mobile) */}
        <DashboardTopBar />

        {/* Inner Padding Container: px-4 md:px-12 lg:px-16 pt-6 md:pt-10 pb-14 w-full */}
        <div className="w-full max-w-[1280px] px-4 sm:px-6 md:px-10 lg:px-14 pt-4 md:pt-8 pb-16 flex flex-col gap-6 md:gap-8">
          {/* Stats & Greeting Header */}
          {stateParam !== 'empty' && currentView !== 'empty' && (
            <DashboardStatsHeader
              title={headerTitle}
              subtitle={headerSubtitle}
              chips={statChips}
              studentName="أحمد"
              unreadNotificationsCount={5}
              onNotificationsClick={() => handleSelectView('notifications')}
              onAvatarClick={() => navigate('/profile')}
            />
          )}

          {/* Empty State View */}
          {(stateParam === 'empty' || currentView === 'empty') && (
            <div className="w-full py-6">
              <EmptyDashboardState userName="سارة" />
            </div>
          )}

          {/* Notifications View */}
          {currentView === 'notifications' && (
            <div className="w-full max-w-4xl mx-auto py-2">
              <NotificationsView onBack={() => handleSelectView('main')} />
            </div>
          )}

          {/* Two-Column Grid for Main, Live, Saved, Achievements views */}
          {currentView !== 'empty' && stateParam !== 'empty' && currentView !== 'notifications' && (
            <div
              data-layer="Two-Column-Grid"
              className="TwoColumnGrid self-stretch flex flex-col lg:flex-row justify-start items-start gap-8 w-full"
            >
              {/* Primary Column (Center in Desktop, fills flex-1) */}
              <div
                data-layer="Primary-Column"
                className="PrimaryColumn flex-1 min-w-0 w-full flex flex-col justify-start items-start gap-8 order-1"
              >
                {/* 1. Main / Live View */}
                {(currentView === 'main' || currentView === 'live') && (
                  <>
                    {/* Hero Card: Live session or Priority continue */}
                    {stateParam === 'live' || currentView === 'live' ? (
                      <LiveSessionPriorityCard
                        courseTitle="برمجة بايثون للمبتدئين"
                        instructorName="م. خالد الشمري"
                        sessionDescription="شاشة المباشرة والأسئلة تفاعلية"
                        initialMinutes={14}
                        initialSeconds={3}
                        onJoinSession={() => navigate('/catalog')}
                      />
                    ) : (
                      <PriorityContinueCard
                        courseId="course-ai"
                        courseTitle="أساسيات الذكاء الاصطناعي وتعلم الآلة"
                        courseTrack="المستوى المتوسط • 8 أسابيع • بإشراف نخبة من المختصين"
                        currentLesson={4}
                        totalLessons={10}
                        completionPercentage={40}
                        tagLabel="موصى به لليوم"
                      />
                    )}

                    {/* Courses Section */}
                    <div
                      data-layer="Courses-Section"
                      className="CoursesSection self-stretch flex flex-col justify-start items-start gap-4 w-full"
                    >
                      <div
                        data-layer="Section-Header"
                        className="SectionHeader self-stretch flex justify-between items-center w-full"
                      >
                        <h2
                          data-layer="دوراتي الحالية"
                          className="text-slate-200 text-lg md:text-xl font-bold font-['Cairo'] leading-6"
                        >
                          {stateParam === 'live' || currentView === 'live' ? 'بقية دوراتك لليوم' : 'دوراتي الحالية'}
                        </h2>

                        <button
                          type="button"
                          onClick={() => navigate('/catalog?type=courses')}
                          data-layer="عرض الكل"
                          className="text-sky-400 hover:text-sky-300 text-sm md:text-base font-bold font-['Tajawal'] leading-6 transition-colors cursor-pointer"
                        >
                          عرض الكل
                        </button>
                      </div>

                      {/* Courses List */}
                      <div
                        data-layer="Courses-List"
                        className="CoursesList self-stretch flex flex-col justify-start items-start gap-3 w-full"
                      >
                        {enrolledCourses.map((course) => (
                          <EnrolledCourseRow
                            key={course.id}
                            id={course.id}
                            title={course.title}
                            category={course.category}
                            progressPercent={course.progressPercent}
                            iconType={course.iconType}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 2. Saved Scholarships & Favorites View */}
                {currentView === 'saved' && <SavedScholarshipsView />}

                {/* 3. Competitions & Certificates View */}
                {currentView === 'achievements' && <CompetitionsCertificatesView />}
              </div>

              {/* Sidebar-Widgets Column (Left side in RTL desktop, 384px width) */}
              <div className="order-2 w-full lg:w-auto">
                <DashboardStatsSidebar />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Permanent Desktop Navigation Sidebar on the right (w-60, 240px) matching Figma */}
      <DesktopDashboardSidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        unreadNotificationsCount={5}
      />
    </div>
  );
};