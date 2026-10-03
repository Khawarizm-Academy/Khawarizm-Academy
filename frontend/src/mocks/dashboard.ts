import type {
  EnrolledCourse,
  LiveSessionInfo,
  DashboardStats,
  UpcomingEvent,
  DashboardNotification,
  SavedScholarshipItem,
  FavoriteCourseItem,
  CompetitionItem,
  CertificateItem,
  NotificationItemData,
} from '../features/dashboard/types';

export const mockEnrolledCourses: EnrolledCourse[] = [
  {
    id: 'course-python',
    title: 'أساسيات البرمجة بلغة بايثون',
    instructor: 'د. سارة العتيبي',
    totalLessons: 24,
    track: 'مسار تطوير البرمجيات',
    progress: 68,
    lastLesson: 'الوحدة 4 · الدرس 3: الدوال والمعاملات',
    exactUnitLesson: 'الوحدة 4 · الدرس 3: الدوال والمعاملات',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    nextLiveTime: 'الثلاثاء، 7:30 م',
    iconType: 'python',
    isCompleted: false,
    slug: 'python-fundamentals',
  },
  {
    id: 'course-data',
    title: 'تحليل البيانات واتخاذ القرار',
    instructor: 'م. عمر الحربي',
    totalLessons: 18,
    track: 'مسار علم وتحليل البيانات',
    progress: 42,
    lastLesson: 'الوحدة 2 · الدرس 6: تنظيف البيانات',
    exactUnitLesson: 'الوحدة 2 · الدرس 6: تنظيف البيانات',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    iconType: 'data',
    isCompleted: false,
    slug: 'data-analysis-decision',
  },
  {
    id: 'course-ai',
    title: 'مقدمة في الذكاء الاصطناعي',
    instructor: 'د. ليان منصور',
    totalLessons: 20,
    track: 'مسار الذكاء الاصطناعي التوليدي',
    progress: 100,
    lastLesson: 'المشروع الختامي وتطبيقات الذكاء الاصطناعي',
    exactUnitLesson: 'أكملت المسار في 14 سبتمبر 2026',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop&q=80',
    completionDate: '14 سبتمبر 2026',
    isCompleted: true,
    iconType: 'ai',
    slug: 'intro-to-ai',
  },
];

export const mockPriorityContinueCourse = {
  id: 'priority-ai',
  title: 'أساسيات الذكاء الاصطناعي وتعلم الآلة',
  levelDuration: 'المستوى المتوسط • 8 أسابيع',
  instructorSubtitle: 'بإشراف نخبة من المختصين في هندسة البيانات',
  lessonStatus: 'الدرس 4 من 10 • 40% مكتمل',
  progress: 40,
  thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=300&auto=format&fit=crop&q=80',
};

export const mockImminentLiveSession: LiveSessionInfo = {
  id: 'live-python-01',
  courseTitle: 'برمجة بايثون للمبتدئين',
  instructor: 'المعلم: م. خالد الشمري • شاشة المباشرة والأسئلة تفاعلية',
  initialRemainingSeconds: 843,
  thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80',
  meetUrl: 'https://meet.google.com/khw-pyth-live',
};

export const mockDashboardStats: DashboardStats = {
  attendanceRate: 98,
  attendanceNote: 'ملتزم بالحصص المباشرة',
  gpa: '4.9 / 5.0',
  gpaRating: 'تصنيف ممتاز',
  pointsEarned: 1240,
  rankNote: 'الترتيب العاشر على الدفعة',
};

export const mockUpcomingEvents: UpcomingEvent[] = [
  {
    id: 'event-1',
    title: 'تسليم مشروع تخرج الويب',
    dateText: 'الأحد، 15 يناير • 11:59 م',
    type: 'submission',
    typeLabel: 'تسليم',
  },
  {
    id: 'event-2',
    title: 'الاختبار النهائي - بايثون',
    dateText: 'الأربعاء، 18 يناير • 06:00 م',
    type: 'exam',
    typeLabel: 'اختبار',
  },
];

export const mockNotifications: DashboardNotification[] = [
  {
    id: 'notif-1',
    title: 'جلستك المباشرة في برمجة بايثون تبدأ خلال 30 دقيقة. استعد وانضم الآن.',
    timeAgo: 'منذ 5 دقائق',
    type: 'live',
    isRead: false,
    link: '/dashboard?state=live',
  },
  {
    id: 'notif-2',
    title: 'منحة جديدة تطابق اهتماماتك: برنامج الابتعاث الخارجي المتميز.',
    timeAgo: 'منذ ساعتين',
    type: 'scholarship',
    isRead: false,
    link: '/catalog?type=scholarships',
  },
  {
    id: 'notif-3',
    title: 'تم تصحيح اختبارك في أساسيات البرمجة — نتيجتك 87%. مبارك النجاح!',
    timeAgo: 'أمس',
    type: 'exam',
    isRead: false,
    link: '/dashboard?view=achievements',
  },
  {
    id: 'notif-4',
    title: 'مسابقة تحدي الخوارزميات تبدأ غدًا. تأكد من مراجعة القواعد والتحضير.',
    timeAgo: 'منذ يومين',
    type: 'competition',
    isRead: true,
    link: '/competitions',
  },
  {
    id: 'notif-5',
    title: 'تمت إضافة درس جديد في تصميم واجهات المستخدم (أدوات النماذج التفاعلية).',
    timeAgo: 'منذ 3 أيام',
    type: 'lesson',
    isRead: true,
    link: '/catalog?type=courses',
  },
  {
    id: 'notif-6',
    title: 'تحديث حالة طلب المنحة: تم قبول طلبك المبدئي في منحة التميز العلمي.',
    timeAgo: 'منذ أسبوع',
    type: 'application',
    isRead: true,
    link: '/dashboard?view=saved',
  },
];

export const mockDashboardNotifications: NotificationItemData[] = [
  {
    id: 'view-notif-1',
    message: 'جلستك المباشرة في برمجة بايثون تبدأ خلال 30 دقيقة. استعد وانضم الآن للتفاعل المباشر.',
    timeAgo: 'منذ 5 دقائق',
    isUnread: true,
    type: 'live',
  },
  {
    id: 'view-notif-2',
    message: 'منحة جديدة تطابق اهتماماتك وتخصصك: برنامج الابتعاث الخارجي المتميز لمرحلة البكالوريوس والماجستير.',
    timeAgo: 'منذ ساعتين',
    isUnread: true,
    type: 'scholarship',
  },
  {
    id: 'view-notif-3',
    message: 'تم تصحيح اختبارك في أساسيات البرمجة بنجاح - حصلت على درجة مميزة 87%. مبارك نجاحك!',
    timeAgo: 'أمس',
    isUnread: true,
    type: 'exam',
  },
  {
    id: 'view-notif-4',
    message: 'تحدي الخوارزميات الشتوي يبدأ غدًا في الصباح الباكر. تأكد من مراجعة القواعد والتحضير بشكل مناسب.',
    timeAgo: 'منذ يومين',
    isUnread: false,
    type: 'competition',
  },
  {
    id: 'view-notif-5',
    message: 'تمت إضافة درس جديد في تصميم واجهات المستخدم (أدوات النماذج التفاعلية المتقدمة وتجربة المستخدم).',
    timeAgo: 'منذ 3 أيام',
    isUnread: false,
    type: 'lesson',
  },
  {
    id: 'view-notif-6',
    message: 'تحديث حالة طلب المنحة: تم قبول طلبك المبدئي في منحة التميز العلمي والابتكار التقني.',
    timeAgo: 'منذ أسبوع',
    isUnread: false,
    type: 'scholarship',
  },
];

export const mockSavedScholarships: SavedScholarshipItem[] = [
  {
    id: 'saved-sch-1',
    title: 'منحة التميز العلمي للدراسات العليا',
    provider: 'جامعة الملك عبدالله للعلوم والتقنية',
    location: 'المملكة العربية السعودية',
    deadlineText: 'متبقي 3 أيام',
    coverage: 'تمويل كامل',
    degree: 'ماجستير / دكتوراه',
    isApplied: false,
  },
  {
    id: 'saved-sch-2',
    title: 'برنامج الابتعاث الثقافي الدولي',
    provider: 'وزارة الثقافة',
    location: 'فرنسا',
    deadlineText: 'متبقي 12 يوم',
    coverage: 'تمويل كامل + مخصصات',
    degree: 'بكالوريوس / ماجستير',
    isApplied: true,
  },
  {
    id: 'saved-sch-3',
    title: 'منحة إيراسموس موندوس في التكنولوجيا',
    provider: 'المفوضية الأوروبية',
    location: 'الاتحاد الأوروبي',
    deadlineText: 'متبقي 24 يوم',
    coverage: 'تمويل كامل',
    degree: 'ماجستير',
    isApplied: false,
  },
];

export const mockFavoriteCourses: FavoriteCourseItem[] = [
  {
    id: 'fav-course-1',
    title: 'أساسيات الذكاء الاصطناعي وتعلم الآلة',
    category: 'ذكاء اصطناعي',
    level: 'مبتدئ',
    duration: '6 أسابيع',
    instructor: 'أ. د. أحمد خوارزم',
    progress: 40,
    type: 'course',
  },
  {
    id: 'fav-course-2',
    title: 'خوارزميات وهياكل البيانات المتقدمة',
    category: 'علوم الحاسوب',
    level: 'متقدم',
    duration: '8 أسابيع',
    instructor: 'أ. خالد النجار',
    progress: 0,
    type: 'course',
  },
];

export const mockCompetitions: CompetitionItem[] = [
  {
    id: 'comp-1',
    title: 'تحدي الخوارزميات الشتوي 2026',
    type: 'برمجة',
    status: 'جاري التسجيل',
    timeLeft: 'متبقي 5 أيام',
    participants: 1240,
    isRegistered: true,
    slug: 'winter-algorithm-challenge',
  },
  {
    id: 'comp-2',
    title: 'مسابقة تطوير تطبيقات الهاتف الذكي',
    type: 'تطبيقات',
    status: 'قريبًا',
    timeLeft: 'يبدا بعد أسبوع',
    participants: 850,
    isRegistered: false,
    slug: 'mobile-app-competition',
  },
  {
    id: 'comp-3',
    title: 'تحدي تحليل البيانات المفتوح',
    type: 'بيانات',
    status: 'منتهي',
    timeLeft: 'انتهى',
    participants: 2100,
    isRegistered: true,
    slug: 'open-data-challenge',
  },
];

export const mockCertificates: CertificateItem[] = [
  {
    id: 'cert-1',
    title: 'شهادة إتمام دورة مقدمة في الذكاء الاصطناعي',
    issuer: 'أكاديمية خوارزم',
    issueDate: '14 سبتمبر 2026',
    downloadUrl: '/certificates/intro-ai.pdf',
    type: 'course',
  },
  {
    id: 'cert-2',
    title: 'شهادة المشاركة - تحدي الخوارزميات الصيفي',
    issuer: 'أكاديمية خوارزم',
    issueDate: '22 يوليو 2026',
    downloadUrl: '/certificates/summer-algo.pdf',
    type: 'competition',
  },
];
