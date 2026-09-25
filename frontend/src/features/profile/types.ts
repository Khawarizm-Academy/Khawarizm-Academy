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

export const INITIAL_USER_PROFILE: UserProfileData = {
  fullName: 'أحمد محمد القحطاني',
  email: 'ahmad.q@example.com',
  phone: '+966 55 820 1437',
  membershipStatus: 'متعلّم منذ مارس 2024 · المستوى المتوسط',
  avatarInitials: 'أق',
  learningLevel: 'intermediate',
  interests: ['الذكاء الاصطناعي', 'تحليل البيانات', 'البرمجة والتطوير'],
  notifications: {
    liveSessionReminders: true,
    weeklyProgressSummary: true,
    recommendedOpportunities: false,
  },
  language: 'ar',
  timezone: 'الرياض (GMT+3)',
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
