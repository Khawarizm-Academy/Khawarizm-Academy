export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';
export type InterfaceLanguage = 'ar' | 'en';

export interface UserNotificationPreferences {
  liveSessionReminders: boolean;
  weeklyProgressSummary: boolean;
  recommendedOpportunities: boolean;
}

export interface UserProfileData {
  fullName: string;
  email: string;
  phone: string;
  membershipStatus: string;
  avatarInitials: string;
  avatarUrl?: string;
  learningLevel: LearningLevel;
  interests: string[];
  notifications: UserNotificationPreferences;
  language: InterfaceLanguage;
  timezone: string;
}

/** Blank form model; real values arrive from GET /profile. */
export const EMPTY_PROFILE: UserProfileData = {
  fullName: '',
  email: '',
  phone: '',
  membershipStatus: '',
  avatarInitials: '',
  learningLevel: 'beginner',
  interests: [],
  notifications: {
    liveSessionReminders: false,
    weeklyProgressSummary: false,
    recommendedOpportunities: false,
  },
  language: 'ar',
  timezone: '',
};

export const AVAILABLE_INTERESTS: string[] = [
  'الذكاء الاصطناعي',
  'تحليل البيانات',
  'البرمجة والتطوير',
  'الأمن السيبراني',
  'تصميم الواجهات UI/UX',
  'الحوسبة السحابية',
  'تعلم الآلة',
  'إدارة المنتجات التقنية',
];
