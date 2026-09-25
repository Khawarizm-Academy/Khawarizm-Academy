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
} from '../types';

export const mockEnrolledCourses: EnrolledCourse[] = [
  {
    id: 'course-uiux',
    title: 'تصميم واجهات المستخدم UI/UX للمتقدمين',
    track: 'مسار التصميم والابتكار',
    progress: 75,
    lastLesson: 'أدوات النماذج التفاعلية المتقدمة وتجربة المستخدم',
    thumbnail: 'https://images.unsplash.com/photo-1581291518655-9523c932edcf?w=200&auto=format&fit=crop&q=80',
    instructor: 'أ. سارة المنصور',
  },
  {
    id: 'course-python',
    title: 'برمجة بايثون للمبتدئين',
    track: 'مسار تطوير البرمجيات',
    progress: 20,
    lastLesson: 'هياكل البيانات والدوال البرمجية المتقدمة',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80',
    instructor: 'م. خالد الشمري',
    nextLiveTime: 'اليوم، 06:00 م',
  },
  {
    id: 'course-ai',
    title: 'أساسيات الذكاء الاصطناعي وتطبيقاته',
    track: 'مسار التقنيات الناشئة',
    progress: 40,
    lastLesson: 'مفاهيم تعلم الآلة والشبكات العصبية العميقة',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=200&auto=format&fit=crop&q=80',
    instructor: 'د. طارق القحطاني',
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
  initialRemainingSeconds: 843, // 14 minutes and 3 seconds
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
    id: 'sch-kaust-01',
    title: 'منحة التميز لعلوم الحاسب والابتكار التقني',
    provider: 'جامعة الملك عبدالله للعلوم والتقنية',
    deadlineText: 'باقي 18 ساعة',
    isUrgent: true,
    coverage: 'تغطية كاملة 100% شاملة الرسوم الدراسية والسكن وبدل شهري',
    gpaRequirement: '4.5 فما فوق (مكتمل لديك: 4.9)',
  },
  {
    id: 'sch-tuwaiq-02',
    title: 'برنامج الابتعاث الثقافي والدولي',
    provider: 'وزارة الثقافة',
    deadlineText: 'باقي 5 أيام',
    isUrgent: false,
    coverage: 'ابتعاث دولي متكامل لمرحلتي البكالوريوس والماجستير',
    gpaRequirement: '4.0 فما فوق (مكتمل لديك: 4.9)',
  },
  {
    id: 'sch-sdaia-03',
    title: 'منحة رواد الغد للتكنولوجيا',
    provider: 'مؤسسة طويق',
    deadlineText: 'باقي 12 يوم',
    isUrgent: false,
    coverage: 'معسكرات تدريبية متقدمة وتوظيف مباشر للمتميزين',
    gpaRequirement: '3.75 فما فوق (مكتمل لديك: 4.9)',
  },
  {
    id: 'sch-oxford-04',
    title: 'برنامج زمالة الذكاء الاصطناعي المتقدم',
    provider: 'المركز الوطني للذكاء الاصطناعي',
    deadlineText: 'باقي 24 يوم',
    isUrgent: false,
    coverage: 'أبحاث مشتركة مع مختبرات الذكاء الاصطناعي الدولية',
    gpaRequirement: '4.2 فما فوق (مكتمل لديك: 4.9)',
  },
];

export const mockFavoriteCourses: FavoriteCourseItem[] = [
  {
    id: 'course-fav-1',
    title: 'الأمن السيبراني والدفاع الرقمي الاستباقي',
    provider: 'مسار الأمن المتقدم • 10 أسابيع',
    durationText: 'معتمدة دولياً',
  },
  {
    id: 'course-fav-2',
    title: 'الحوسبة الكمية ومستقبل الخوارزميات',
    provider: 'مسار الفيزياء التقنية • 6 أسابيع',
    durationText: 'مستوى متقدم',
  },
];

export const mockCompetitions: CompetitionItem[] = [
  {
    id: 'comp-1',
    title: 'تحدي الخوارزميات الشتوي',
    statusText: 'مسجل ومجدول في يناير',
    statusColor: 'blue',
    actionLabel: 'عرض التفاصيل',
    actionVariant: 'sky',
  },
  {
    id: 'comp-2',
    title: 'مسابقة البرمجة التنافسية للأكاديميات',
    statusText: 'جارية الآن (تحدي البث المباشر)',
    statusColor: 'red',
    actionLabel: 'ادخل الساحة',
    actionVariant: 'gold',
  },
  {
    id: 'comp-3',
    title: 'هاكاثون الابتكار الوطني',
    statusText: 'انتهت • حققت المركز الثالث',
    statusColor: 'green',
    actionLabel: 'عرض النتائج',
    actionVariant: 'sky',
  },
];

export const mockCertificates: CertificateItem[] = [
  {
    id: 'cert-1',
    title: 'شهادة إتمام: أساسيات الذكاء الاصطناعي التوليدي',
    issueDate: '10 يناير 2026',
    credentialId: 'KHW-AI-89421',
    isOfficial: true,
  },
  {
    id: 'cert-2',
    title: 'شهادة إتمام: تصميم واجهات وتجربة المستخدم المتقدمة',
    issueDate: '28 ديسمبر 2025',
    credentialId: 'KHW-UX-77319',
    isOfficial: true,
  },
];
