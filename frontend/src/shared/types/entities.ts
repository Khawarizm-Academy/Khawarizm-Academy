import type {
  CourseLevelKey,
  CourseStatusKey,
  ScholarshipCoverageKey,
  DegreeLevelKey,
  EventFormatKey,
} from '../lib/localization';

export interface Course {
  id: string;
  title: string;
  category: string;
  level: CourseLevelKey | 'مبتدئ' | 'متوسط' | 'متقدم';
  duration: string;
  studentsCount?: string;
  instructor?: string;
  price?: string;
  status?: CourseStatusKey | 'متاح' | 'قريباً' | 'مغلق' | string;
  thumbnailType: 'ai_generative' | 'web_frontend' | 'python_data' | 'ai_ml';
}

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  location: string;
  deadlineText: string;
  deadlineUrgency?: 'critical' | 'warning' | 'open';
  coverage: ScholarshipCoverageKey | 'ممولة بالكامل' | 'تمويل جزئي' | 'تدريب عملي' | 'جزئية' | string;
  degreeLevel?: DegreeLevelKey | 'ماجستير' | 'بكالوريوس' | 'دكتوراه' | 'تدريب مهني' | string;
  iconType?: 'university' | 'globe' | 'briefcase';
  thumbnailType: 'astrolabe_scholarship' | 'campus_night' | 'leadership_dubai';
}

export interface Competition {
  id: string;
  title: string;
  badge: string;
  description: string;
  daysRemaining: string;
  hoursRemaining: string;
  actionText: string;
}

export interface EventItem {
  id: string;
  title: string;
  description?: string;
  badge: string;
  date: string;
  format: EventFormatKey | 'بث مباشر' | 'حضوري' | 'عبر الإنترنت' | string;
  isFeatured?: boolean;
  thumbnailType: 'space_astrolabe' | 'data_science_stage' | 'academic_workshop';
}
