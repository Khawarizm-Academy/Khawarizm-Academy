import React, { useMemo, useState } from 'react';
import { Trophy, GraduationCap, BookOpen, Award, User, Sparkles } from 'lucide-react';
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

export const DashboardPage: React.FC = () => {
  const { search } = useLocation();
  const navigate = useNavigate();

  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const viewParam = queryParams.get('view') || 'main';
  const stateParam = queryParams.get('state'); // 'live' | 'empty' | undefined

  // Active view state
  const currentView = viewParam;

  // In-Dashboard Self-Contained Modal Chambers state
  const [activeWorkspaceCourse, setActiveWorkspaceCourse] = useState<string | null>(null);
  const [isLiveClassroomOpen, setIsLiveClassroomOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<SavedScholarshipItem | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<CompetitionItem | null>(null);
  const [previewCertificate, setPreviewCertificate] = useState<CertificateItem | null>(null);

  const handleSelectView = (viewId: string) => {
    navigate(`/dashboard?view=${viewId}`);
  };

  // Header content and stat chips based on active view matching Figma
  let headerTitle = 'مرحبًا، أحمد';
  let headerSubtitle = 'لديك تقدم مميز اليوم. تابع إنجازك الدراسي!';
  let statChips: StatChipItem[] = [
    {
      icon: Trophy,
      label: 'مسابقة ذكاء اصطناعي مسجّل بها',
      iconColor: 'text-[#E5B65C]',
      onClick: () => handleSelectView('achievements'),
    },
    {
      icon: GraduationCap,
      label: 'منحتان دراسيتان قريبتا الانتهاء',
      iconColor: 'text-sky-400',
      onClick: () => handleSelectView('saved'),
    },
    {
      icon: BookOpen,
      label: '3 دورات نشطة ومسجلة',
      iconColor: 'text-sky-400',
      onClick: () => handleSelectView('enrolled'),
    },
  ];

  if (stateParam === 'live' || currentView === 'live') {
    headerTitle = 'الجلسات المباشرة';
    headerSubtitle = 'انضم للفصول الافتراضية التفاعلية مع المعلمين';
    statChips = [
      {
        icon: Trophy,
        label: 'بث مباشر تفاعلي الآن',
        iconColor: 'text-red-400',
        onClick: () => setIsLiveClassroomOpen(true),
      },
      {
        icon: BookOpen,
        label: 'حصة بايثون للمبتدئين',
        iconColor: 'text-sky-400',
        onClick: () => setActiveWorkspaceCourse('برمجة بايثون للمبتدئين'),
      },
    ];
  } else if (currentView === 'saved') {
    headerTitle = 'لوحتي المحفوظة';
    headerSubtitle = 'تابع المنح الدراسية والدورات المفضلة والتقديمات القادمة';
    statChips = [
      {
        icon: Trophy,
        label: 'برامج ابتعاث تفاعلية',
        iconColor: 'text-[#E5B65C]',
        onClick: () => handleSelectView('saved'),
      },
      {
        icon: GraduationCap,
        label: '4 منح محفوظات حاليًا',
        iconColor: 'text-sky-400',
        onClick: () => handleSelectView('saved'),
      },
      {
        icon: BookOpen,
        label: 'مستندات جاهزة للتقديم',
        iconColor: 'text-sky-400',
        onClick: () => handleSelectView('saved'),
      },
    ];
  } else if (currentView === 'achievements') {
    headerTitle = 'إنجازاتي وتحدياتي';
    headerSubtitle = 'سجل التحديات البرمجية والشهادات الرسمية المعتمدة';
    statChips = [
      {
        icon: Trophy,
        label: '3 تحديات نشطة',
        iconColor: 'text-[#E5B65C]',
        onClick: () => handleSelectView('achievements'),
      },
      {
        icon: Award,
        label: '6 شهادات موثقة',
        iconColor: 'text-sky-400',
        onClick: () => handleSelectView('achievements'),
      },
    ];
  } else if (currentView === 'notifications') {
    headerTitle = 'مركز الإشعارات';
    headerSubtitle = 'لديك 3 تنبيهات جديدة غير مقروءة';
  } else if (currentView === 'enrolled' || currentView === 'courses') {
    headerTitle = 'دوراتي المسجّلة';
    headerSubtitle = 'تابع مساراتك الأكاديمية والدروس المكتملة وجلساتك المباشرة';
    statChips = [
      {
        icon: BookOpen,
        label: '3 دورات مسجلة',
        iconColor: 'text-sky-400',
        onClick: () => handleSelectView('enrolled'),
      },
      {
        icon: Trophy,
        label: 'دورة واحدة مكتملة 100%',
        iconColor: 'text-[#E5B65C]',
        onClick: () => handleSelectView('enrolled'),
      },
    ];
  } else if (currentView === 'profile') {
    headerTitle = 'الملف الشخصي';
    headerSubtitle = 'إدارة بياناتك الشخصية، تفضيلات التعلّم، وإعدادات الحساب';
    statChips = [
      {
        icon: User,
        label: 'بيانات الحساب مكتملة',
        iconColor: 'text-[#E5B65C]',
      },
      {
        icon: Sparkles,
        label: '3 مسارات اهتمام نشطة',
        iconColor: 'text-sky-400',
      },
    ];
  }

  // Course rows for main / live views (Tier 2: real async load via cache)
  const { data: coursesData, isLoading: isLoadingCourses } = useCachedData<EnrolledCourse[]>(['dashboard', 'courses-list'], fetchEnrolledCourses, { initialData: [] });

  const enrolledCourses = coursesData.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.track,
    progressPercent: c.progress,
    iconType: (c.id.includes('uiux') ? 'uiux' : c.id.includes('python') ? 'python' : 'ai') as 'uiux' | 'python' | 'ai',
  }));

  const handleNotificationAction = (notif: NotificationItemData) => {
    if (notif.type === 'live') {
      setIsLiveClassroomOpen(true);
    } else if (notif.type === 'scholarship') {
      setSelectedScholarship({
        id: 'sch-kaust-01',
        title: 'منحة التميز لعلوم الحاسب والابتكار التقني',
        provider: 'جامعة الملك عبدالله للعلوم والتقنية',
        deadlineText: 'باقي 18 ساعة',
        isUrgent: true,
        coverage: 'تغطية كاملة 100% شاملة الرسوم الدراسية والسكن وبدل شهري',
        gpaRequirement: '4.5 فما فوق (مكتمل لديك: 4.9)',
      });
    } else if (notif.type === 'competition') {
      setSelectedCompetition({
        id: 'comp-2',
        title: 'مسابقة البرمجة التنافسية للأكاديميات',
        statusText: 'جارية الآن (تحدي البث المباشر)',
        statusColor: 'red',
        actionLabel: 'ادخل الساحة',
        actionVariant: 'gold',
      });
    } else {
      setActiveWorkspaceCourse('أساسيات الذكاء الاصطناعي وتعلم الآلة');
    }
  };

  return (
    <div
      dir="rtl"
      className="w-full min-h-screen bg-slate-900 flex justify-start items-start text-slate-100 selection:bg-sky-500/20 selection:text-sky-300 relative overflow-x-hidden"
    >
      {/* Ambient background glows matching Figma — strictly contained in an overflow-hidden layer to prevent expanding page scroll height */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="size-[600px] -left-[200px] top-[400px] absolute bg-radial from-sky-400/5 to-transparent" />
        <div className="size-[600px] left-[800px] top-[800px] absolute bg-radial from-[#E5B65C]/5 to-transparent" />
      </div>

      {/* ========================================================================= */}
      {/* 1. PERMANENT RIGHT DESKTOP SIDEBAR (w-60, 240px) */}
      {/* In RTL flex-row, Child #1 renders strictly on the FAR RIGHT */}
      {/* ========================================================================= */}
      <DesktopDashboardSidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        unreadNotificationsCount={5}
      />

      {/* ========================================================================= */}
      {/* 2. MAIN BODY CONTENT AREA (Fills screen to the left of the right sidebar) */}
      {/* In RTL flex-row, Child #2 renders to the LEFT of Child #1 */}
      {/* ========================================================================= */}
      <div

        className="flex-1 min-w-0 flex flex-col justify-start items-start relative z-10"
      >
        {/* Top-Bar matching Figma desktop (Search on right, Nav links on left) */}
        <DashboardTopBar />

        {/* Inner Padding Container */}
        <div className="w-full max-w-[1280px] px-4 sm:px-6 md:px-10 lg:px-14 pt-4 md:pt-8 pb-24 lg:pb-8 flex flex-col gap-6 md:gap-8">
          {/* Stats & Greeting Header */}
          {stateParam !== 'empty' && currentView !== 'empty' && currentView !== 'profile' && currentView !== 'enrolled' && currentView !== 'courses' && (
            <div className="animate-fade-in-up">
              <DashboardStatsHeader
                title={headerTitle}
                subtitle={headerSubtitle}
                chips={statChips}
                studentName="أحمد"
                unreadNotificationsCount={5}
                onNotificationsClick={() => handleSelectView('notifications')}
                onAvatarClick={() => handleSelectView('profile')}
              />
            </div>
          )}

          {/* Empty State View */}
          {(stateParam === 'empty' || currentView === 'empty') && (
            <>
              <MobileDashboardTopBar
                title={
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-full bg-[#061A3A] border border-blue-900 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      <User size={18} className="text-sky-400" />
                    </div>
                    <span className="text-slate-200 text-lg font-bold font-['IBM_Plex_Sans_Arabic']">
                      مرحبًا، سارة
                    </span>
                  </div>
                }
                onNotificationsClick={() => handleSelectView('notifications')}
              />

              <div className="w-full py-2 md:py-6 animate-fade-in-up animation-delay-100">
                <EmptyDashboardState userName="سارة" />
              </div>
            </>
          )}

          {/* Notifications View */}
          {currentView === 'notifications' && (
            <div className="w-full max-w-4xl mx-auto py-2 animate-fade-in-up">
              <NotificationsView
                onBack={() => handleSelectView('main')}
                onSelectNotification={handleNotificationAction}
              />
            </div>
          )}

          {/* Profile View (حسابي) */}
          {currentView === 'profile' && (
            <>
              <MobileDashboardTopBar
                title={
                  <div className="flex items-center gap-2.5">
                    <div className="size-8.5 rounded-full bg-[#061A3A] border border-[#E5B65C] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      <span className="text-[#E5B65C] text-xs font-bold font-['IBM_Plex_Sans_Arabic']">أق</span>
                    </div>
                    <span className="text-white text-base font-bold font-['IBM_Plex_Sans_Arabic']">
                      الملف الشخصي
                    </span>
                  </div>
                }
                onNotificationsClick={() => handleSelectView('notifications')}
              />

              <div className="w-full flex flex-col gap-6 py-1 md:py-2 animate-fade-in-up animation-delay-100">
                <DashboardSubNavigation
                  activeView="profile"
                  onSelectView={handleSelectView}
                />
                <ProfileView />
              </div>
            </>
          )}

          {/* Enrolled Courses Dedicated View (الدورات المسجّلة) */}
          {(currentView === 'enrolled' || currentView === 'courses') && stateParam !== 'empty' && (
            <>
              <MobileDashboardTopBar
                title={
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-full bg-[#061A3A] border border-blue-900 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      <BookOpen size={18} className="text-sky-400" />
                    </div>
                    <span className="text-slate-200 text-lg font-bold font-['IBM_Plex_Sans_Arabic']">
                      الدورات المسجّلة
                    </span>
                  </div>
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

          {/* Two-Column Grid for Main, Live, Saved, Achievements views */}
          {currentView !== 'empty' && stateParam !== 'empty' && currentView !== 'notifications' && currentView !== 'profile' && currentView !== 'enrolled' && currentView !== 'courses' && (
            <div

              className="self-stretch flex flex-col lg:flex-row justify-start items-start gap-8 w-full animate-fade-in-up animation-delay-100"
            >
              {/* Primary Column (Center, flex-1) */}
              <div

                className="flex-1 min-w-0 w-full flex flex-col justify-start items-start gap-8 order-1"
              >
                {/* 1. Main / Live View */}
                {(currentView === 'main' || currentView === 'live') && (
                  <>
                    {/* Sub-Navigation Strip */}
                    <DashboardSubNavigation
                      activeView="main"
                      onSelectView={handleSelectView}
                    />

                    {/* Hero Card: Live session or Priority continue */}
                    {stateParam === 'live' || currentView === 'live' ? (
                      <LiveSessionPriorityCard
                        courseTitle="برمجة بايثون للمبتدئين"
                        instructorName="م. خالد الشمري"
                        sessionDescription="شاشة المباشرة والأسئلة تفاعلية"
                        initialMinutes={14}
                        initialSeconds={3}
                        onJoinSession={() => setIsLiveClassroomOpen(true)}
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
                        onContinue={() => setActiveWorkspaceCourse('أساسيات الذكاء الاصطناعي وتعلم الآلة')}
                      />
                    )}

                    {/* Courses Section */}
                    <div

                      className="self-stretch flex flex-col justify-start items-start gap-4 w-full"
                    >
                      <div

                        className="self-stretch flex justify-between items-center w-full"
                      >
                        <h2

                          className="text-slate-200 text-lg md:text-xl font-bold font-['IBM_Plex_Sans_Arabic'] leading-6"
                        >
                          {stateParam === 'live' || currentView === 'live' ? 'بقية دوراتك لليوم' : 'دوراتي الحالية'}
                        </h2>

                        <button
                          type="button"
                          onClick={() => handleSelectView('enrolled')}

                          className="text-sky-400 hover:text-sky-300 text-sm md:text-base font-bold font-['Tajawal'] leading-6 transition-colors cursor-pointer"
                        >
                          عرض الكل
                        </button>
                      </div>

                      {/* Courses List */}
                      <div

                        className="self-stretch flex flex-col justify-start items-start gap-3 w-full"
                      >
                        {isLoadingCourses ? (
                          <DataSectionSkeleton variant="list" count={3} />
                        ) : (
                          enrolledCourses.map((course) => (
                            <EnrolledCourseRow
                              key={course.id}
                              id={course.id}
                              title={course.title}
                              category={course.category}
                              progressPercent={course.progressPercent}
                              iconType={course.iconType}
                              onContinue={() => setActiveWorkspaceCourse(course.title)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* 2. Saved Scholarships & Favorites View */}
                {currentView === 'saved' && (
                  <SavedScholarshipsView
                    onSelectScholarship={(sch) => setSelectedScholarship(sch)}
                    onSelectCourse={() => setActiveWorkspaceCourse('الدورة المحفوظة')}
                  />
                )}

                {/* 3. Competitions & Certificates View */}
                {currentView === 'achievements' && (
                  <CompetitionsCertificatesView
                    onOpenArena={(comp) => setSelectedCompetition(comp)}
                    onPreviewCertificate={(cert) => setPreviewCertificate(cert)}
                  />
                )}
              </div>

              {/* Sidebar-Widgets Column (Left side in RTL desktop, 384px width) */}
              <div className="order-2 w-full lg:w-auto">
                <DashboardStatsSidebar />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. IN-DASHBOARD SELF-CONTAINED INTERACTIVE WORKSPACE MODALS */}
      {/* ========================================================================= */}
      {/* A. Course Workspace Modal */}
      <CourseWorkspaceModal
        isOpen={!!activeWorkspaceCourse}
        onClose={() => setActiveWorkspaceCourse(null)}
        courseTitle={activeWorkspaceCourse || undefined}
      />

      {/* B. Live Virtual Classroom Modal */}
      <LiveClassroomModal
        isOpen={isLiveClassroomOpen}
        onClose={() => setIsLiveClassroomOpen(false)}
      />

      {/* C. Scholarship Application Modal */}
      <ScholarshipApplicationModal
        isOpen={!!selectedScholarship}
        onClose={() => setSelectedScholarship(null)}
        scholarship={selectedScholarship}
      />

      {/* D. Competition Challenge Arena Modal */}
      <CompetitionArenaModal
        isOpen={!!selectedCompetition}
        onClose={() => setSelectedCompetition(null)}
        competition={selectedCompetition}
      />

      {/* E. Certificate Document Preview Modal */}
      {previewCertificate && (
        <CertificatePreviewModal
          certificate={previewCertificate}
          onClose={() => setPreviewCertificate(null)}
        />
      )}
    </div>
  );
};