import type { Course, Scholarship, Competition, EventItem } from '../types/entities';

export const mockCourses: Course[] = [
  {
    id: 'course-1',
    title: 'هندسة الذكاء الاصطناعي التوليدي',
    category: 'برمجة',
    level: 'متقدم',
    duration: '4 أسابيع',
    studentsCount: '1.2k طالب',
    status: 'متاح',
    thumbnailType: 'ai_generative',
  },
  {
    id: 'course-2',
    title: 'تصميم واجهات المستخدم المتقدمة (UI/UX)',
    category: 'تصميم',
    level: 'مبتدئ',
    duration: '5 أسابيع',
    studentsCount: '850 طالب',
    status: 'قريباً',
    thumbnailType: 'web_frontend',
  },
  {
    id: 'course-3',
    title: 'تحليل البيانات باستخدام بايثون',
    category: 'علوم البيانات',
    level: 'متوسط',
    duration: '8 أسابيع',
    studentsCount: '920 طالب',
    status: 'قريباً',
    thumbnailType: 'python_data',
  },
];

export const mockScholarships: Scholarship[] = [
  {
    id: 'scholarship-1',
    title: 'منحة التميز العلمي للدراسات العليا',
    provider: 'جامعة الملك عبدالله للعلوم والتقنية',
    location: 'لندن، بريطانيا',
    deadlineText: 'ينتهي بعد 3 أيام',
    deadlineUrgency: 'warning',
    coverage: 'ممولة بالكامل',
    degreeLevel: 'ماجستير',
    iconType: 'university',
    thumbnailType: 'astrolabe_scholarship',
  },
  {
    id: 'scholarship-2',
    title: 'برنامج الابتعاث الثقافي الدولي',
    provider: 'وزارة الثقافة',
    location: 'عن بُعد',
    deadlineText: 'باقي 5 أسبوع',
    deadlineUrgency: 'open',
    coverage: 'جزئية',
    degreeLevel: 'بكالوريوس',
    iconType: 'globe',
    thumbnailType: 'campus_night',
  },
  {
    id: 'scholarship-3',
    title: 'برنامج تدريب القادة الشباب',
    provider: 'مؤسسة القيادات العالمية',
    location: 'دبي، الإمارات',
    deadlineText: 'مفتوح',
    deadlineUrgency: 'open',
    coverage: 'تدريب عملي',
    degreeLevel: 'تدريب مهني',
    iconType: 'briefcase',
    thumbnailType: 'leadership_dubai',
  },
];

export const mockCompetitionMobile: Competition = {
  id: 'comp-winter',
  title: 'تحدي الخوارزميات الشتوي',
  badge: 'مسابقة برمجية',
  description: 'شارك في التحدي البرمجي السنوي واختبر قدرتك في حل المشكلات الخوارزمية المعقدة.',
  daysRemaining: '03',
  hoursRemaining: '14',
  actionText: 'سجّل الآن',
};

export const mockCompetitionDesktop: Competition = {
  id: 'comp-annual',
  title: 'تحدي الخوارزميات السنوي',
  badge: 'مسابقة وطنية',
  description: 'شارك في المسابقة الوطنية واربح منحة دراسية كاملة ومكافآت قيّمة.',
  daysRemaining: '14',
  hoursRemaining: '06',
  actionText: 'سجل الآن',
};

export const mockEventMobile: EventItem = {
  id: 'event-mobile-1',
  title: 'الندوة السنوية لعلماء البيانات',
  badge: 'الفعاليات والندوات',
  date: '15 نوفمبر 2024',
  format: 'بث مباشر',
  thumbnailType: 'data_science_stage',
};

export const mockEventDesktopFeatured: EventItem = {
  id: 'event-dsk-1',
  title: 'مستقبل تقنيات الفضاء في الشرق الأوسط',
  badge: 'ندوة حية',
  date: '15 نوفمبر 2023',
  format: 'بث مباشر',
  isFeatured: true,
  thumbnailType: 'space_astrolabe',
};

export const mockEventDesktopWorkshop: EventItem = {
  id: 'event-dsk-2',
  title: 'ورشة: مهارات البحث الأكاديمي المتقدمة',
  description: 'تعلم كيفية استخدام قواعد البيانات العلمية وبناء منهجية بحث رصينة.',
  badge: 'ورشة عمل',
  date: '22 نوفمبر',
  format: 'عبر الإنترنت',
  thumbnailType: 'academic_workshop',
};
