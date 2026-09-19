import React, { useMemo, useState } from 'react';
import { Trophy, GraduationCap, BookOpen, Award } from 'lucide-react';
import { useLocation, useNavigate } from '../../../app/routerContext';
import { DesktopDashboardSidebar } from '../components/DesktopDashboardSidebar';
import { DashboardTopBar } from '../components/DashboardTopBar';
import { DashboardStatsHeader, type StatChipItem } from '../components/DashboardStatsHeader';
import { PriorityContinueCard } from '../components/PriorityContinueCard';
import { LiveSessionPriorityCard } from '../components/LiveSessionPriorityCard';
import { EmptyDashboardState } from '../components/EmptyDashboardState';
import { EnrolledCourseRow } from '../components/EnrolledCourseRow';
import { DashboardStatsSidebar } from '../components/DashboardStatsSidebar';
import { SavedScholarshipsView, type SavedScholarshipItem } from '../components/SavedScholarshipsView';
import { CompetitionsCertificatesView, type CompetitionItem, type CertificateItem } from '../components/CompetitionsCertificatesView';
import { NotificationsView, type NotificationItemData } from '../components/NotificationsView';
import { CourseWorkspaceModal } from '../components/CourseWorkspaceModal';
import { LiveClassroomModal } from '../components/LiveClassroomModal';
import { ScholarshipApplicationModal } from '../components/ScholarshipApplicationModal';
import { CompetitionArenaModal } from '../components/CompetitionArenaModal';

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
    { icon: Trophy, label: 'مسابقة ذكاء اصطناعي مسجّل بها', iconColor: 'text-[#E5B65C]' },
    { icon: GraduationCap, label: 'منحتان دراسيتان قريبتا الانتهاء', iconColor: 'text-sky-400' },
    { icon: BookOpen, label: '3 دورات نشطة ومسجلة', iconColor: 'text-sky-400' },
  ];

  if (stateParam === 'live' || currentView === 'live') {
    headerTitle = 'الجلسات المباشرة';
    headerSubtitle = 'انضم للفصول الافتراضية التفاعلية مع المعلمين';
    statChips = [
      { icon: Trophy, label: 'بث مباشر تفاعلي الآن', iconColor: 'text-red-400' },
      { icon: BookOpen, label: 'حصة بايثون للمبتدئين', iconColor: 'text-sky-400' },
    ];
  } else if (currentView === 'saved') {
    headerTitle = 'لوحتي المحفوظة';
    headerSubtitle = 'تابع المنح الدراسية والدورات المفضلة والتقديمات القادمة';
    statChips = [
      { icon: Trophy, label: 'برامج ابتعاث تفاعلية', iconColor: 'text-[#E5B65C]' },
      { icon: GraduationCap, label: '4 منح محفوظات حاليًا', iconColor: 'text-sky-400' },
      { icon: BookOpen, label: 'مستندات جاهزة للتقديم', iconColor: 'text-sky-400' },
    ];
  } else if (currentView === 'achievements') {
    headerTitle = 'إنجازاتي وتحدياتي';
    headerSubtitle = 'سجل التحديات البرمجية والشهادات الرسمية المعتمدة';
    statChips = [
      { icon: Trophy, label: '3 تحديات نشطة', iconColor: 'text-[#E5B65C]' },
      { icon: Award, label: '6 شهادات موثقة', iconColor: 'text-sky-400' },
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
      data-layer="dashboard-main-desktop"
      className="DashboardMainDesktop w-full min-h-screen bg-slate-900 flex justify-start items-start text-slate-100 selection:bg-sky-500/20 selection:text-sky-300 relative overflow-x-hidden"
    >
      {/* Ambient background glows matching Figma */}
      <div className="size-[600px] -left-[200px] top-[400px] absolute bg-radial from-sky-400/5 to-transparent pointer-events-none" />
      <div className="size-[600px] left-[800px] top-[800px] absolute bg-radial from-[#E5B65C]/5 to-transparent pointer-events-none" />

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
        data-layer="Main-Body"
        className="MainBody flex-1 min-w-0 flex flex-col justify-start items-start"
      >
        {/* Top-Bar matching Figma desktop (Search on right, Nav links on left) */}
        <DashboardTopBar />

        {/* Inner Padding Container */}
        <div className="w-full max-w-[1280px] px-4 sm:px-6 md:px-10 lg:px-14 pt-4 md:pt-8 pb-24 md:pb-16 flex flex-col gap-6 md:gap-8">
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
              <NotificationsView
                onBack={() => handleSelectView('main')}
                onSelectNotification={handleNotificationAction}
              />
            </div>
          )}

          {/* Two-Column Grid for Main, Live, Saved, Achievements views */}
          {currentView !== 'empty' && stateParam !== 'empty' && currentView !== 'notifications' && (
            <div
              data-layer="Two-Column-Grid"
              className="TwoColumnGrid self-stretch flex flex-col lg:flex-row justify-start items-start gap-8 w-full"
            >
              {/* Primary Column (Center, flex-1) */}
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
                            onContinue={() => setActiveWorkspaceCourse(course.title)}
                          />
                        ))}
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
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-[#E5B65C]/60 rounded-3xl p-6 shadow-2xl space-y-5 text-center relative">
            <div className="size-16 rounded-2xl bg-[#E5B65C]/15 border border-[#E5B65C]/40 mx-auto flex items-center justify-center text-[#E5B65C]">
              <Award size={32} />
            </div>
            <div>
              <span className="text-[#E5B65C] font-bold text-xs font-mono uppercase">شهادة موثقة ورسمية</span>
              <h3 className="text-slate-100 font-bold font-['Cairo'] text-lg mt-1">
                {previewCertificate.title}
              </h3>
              <p className="text-slate-400 text-xs font-['Tajawal'] mt-1">
                رقم الاعتماد الدولي: <span className="font-mono text-sky-300">{previewCertificate.credentialId}</span>
              </p>
            </div>
            <div className="p-4 bg-blue-950/40 rounded-2xl border border-blue-900/40 text-xs text-slate-300 space-y-1.5 text-right font-['Tajawal']">
              <div>الممنوحة إلى: <strong className="text-white">أحمد الغامدي</strong></div>
              <div>تاريخ الإصدار: {previewCertificate.issueDate}</div>
              <div>حالة الاعتماد: <span className="text-emerald-400 font-bold">معتمدة ومسجلة في السجل الأكاديمي ✓</span></div>
            </div>
            <button
              type="button"
              onClick={() => setPreviewCertificate(null)}
              className="w-full py-3 bg-[#E5B65C] hover:bg-amber-300 text-slate-900 font-bold font-['Tajawal'] text-sm rounded-xl transition-all cursor-pointer"
            >
              إغلاق الوثيقة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};