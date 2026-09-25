import type {
  EnrolledCourse,
  LiveSessionInfo,
  DashboardStats,
  UpcomingEvent,
  DashboardNotification,
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
