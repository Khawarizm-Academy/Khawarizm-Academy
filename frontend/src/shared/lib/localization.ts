/**
 * Universal Key Converter and Localization System (English <-> Arabic)
 * 
 * Provides type-safe dictionaries, key-to-Arabic conversions, and reverse lookups
 * for navigation tabs, statuses, levels, coverages, search types, and action buttons.
 * Designed for future-proof i18n and clean separation of business logic and presentation.
 */

// ============================================================================
// 1. Domain Key Types (English Identifiers)
// ============================================================================

export type NavTabKey =
  | 'home'
  | 'courses'
  | 'scholarships'
  | 'catalog'
  | 'events'
  | 'competitions'
  | 'dashboard'
  | 'profile';

export type SearchTypeKey = 'course' | 'scholarship' | 'all';

export type CourseLevelKey = 'beginner' | 'intermediate' | 'advanced';

export type CourseStatusKey = 'available' | 'upcoming' | 'closed';

export type ScholarshipCoverageKey =
  | 'fully_funded'
  | 'partially_funded'
  | 'practical_training'
  | 'partial';

export type DegreeLevelKey = 'bachelor' | 'master' | 'phd' | 'vocational';

export type EventFormatKey = 'live' | 'in_person' | 'online';

export type ActionKey =
  | 'apply_now'
  | 'course_details'
  | 'view_all'
  | 'register_now'
  | 'explore_agenda'
  | 'register'
  | 'search';

// ============================================================================
// 2. English-to-Arabic Dictionaries
// ============================================================================

export const EN_TO_AR = {
  // Navigation Tabs
  nav: {
    home: 'الرئيسية',
    courses: 'الدورات',
    scholarships: 'المنح والفرص',
    catalog: 'الدورات والمنح',
    events: 'الفعاليات',
    competitions: 'المسابقات',
    dashboard: 'لوحتي',
    profile: 'حسابي',
  },
  // Mobile Navigation (Shorter labels where appropriate)
  mobileNav: {
    home: 'الرئيسية',
    courses: 'الدورات',
    scholarships: 'المنح',
    dashboard: 'لوحتي',
    profile: 'حسابي',
  },
  // Search Filters
  search: {
    course: 'دورة',
    scholarship: 'منحة',
    all: 'الكل',
  },
  // Course Levels
  courseLevels: {
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم',
  },
  // Course Status
  courseStatus: {
    available: 'متاح',
    upcoming: 'قريباً',
    closed: 'مغلق',
  },
  // Scholarship Coverage
  coverage: {
    fully_funded: 'ممولة بالكامل',
    partially_funded: 'تمويل جزئي',
    practical_training: 'تدريب عملي',
    partial: 'جزئية',
  },
  // Degree Levels
  degreeLevels: {
    bachelor: 'بكالوريوس',
    master: 'ماجستير',
    phd: 'دكتوراه',
    vocational: 'تدريب مهني',
  },
  // Event Formats
  eventFormats: {
    live: 'بث مباشر',
    in_person: 'حضوري',
    online: 'عبر الإنترنت',
  },
  // Action Buttons
  actions: {
    apply_now: 'تقدم الآن',
    course_details: 'تفاصيل الدورة',
    view_all: 'عرض الكل',
    register_now: 'سجل الآن',
    explore_agenda: 'استكشف الأجندة',
    register: 'تسجيل',
    search: 'بحث',
  },
} as const;

export type LocalizationCategory = keyof typeof EN_TO_AR;

// ============================================================================
// 3. Reverse Dictionary (Arabic-to-English)
// ============================================================================

type ReverseLookupMap = Record<string, string>;

function buildReverseMap(): Record<LocalizationCategory, ReverseLookupMap> {
  const result = {} as Record<LocalizationCategory, ReverseLookupMap>;
  for (const cat of Object.keys(EN_TO_AR) as LocalizationCategory[]) {
    result[cat] = {};
    const group = EN_TO_AR[cat] as Record<string, string>;
    for (const [enKey, arVal] of Object.entries(group)) {
      result[cat][arVal] = enKey;
    }
  }
  return result;
}

export const AR_TO_EN = buildReverseMap();

// Flat merged map for universal fallback lookups
const FLAT_EN_TO_AR: Record<string, string> = {};
const FLAT_AR_TO_EN: Record<string, string> = {};

for (const group of Object.values(EN_TO_AR)) {
  for (const [k, v] of Object.entries(group)) {
    FLAT_EN_TO_AR[k] = v;
    FLAT_AR_TO_EN[v] = k;
  }
}

// ============================================================================
// 4. Type-Safe Conversion Helper Functions
// ============================================================================

/**
 * Type-safe lookup for a specific category and key.
 * Example: `toArabic('nav', 'home')` -> 'الرئيسية'
 */
export function toArabic<
  C extends LocalizationCategory,
  K extends keyof (typeof EN_TO_AR)[C]
>(category: C, key: K): string {
  return EN_TO_AR[category][key] as unknown as string;
}

/**
 * Dedicated helper for navigation tabs.
 * Example: `toArabicNav('home')` -> 'الرئيسية'
 */
export function toArabicNav(key: NavTabKey, isMobile = false): string {
  if (isMobile && key in EN_TO_AR.mobileNav) {
    return EN_TO_AR.mobileNav[key as keyof typeof EN_TO_AR.mobileNav];
  }
  return EN_TO_AR.nav[key] ?? key;
}

/**
 * Converts an Arabic label or English key to a normalized English NavTabKey.
 * Example: `toEnglishNav('الرئيسية')` -> 'home'
 * Example: `toEnglishNav('home')` -> 'home'
 */
export function toEnglishNav(value?: string | null): NavTabKey {
  if (!value) return 'home';
  if (value in EN_TO_AR.nav) return value as NavTabKey;
  if (value in AR_TO_EN.nav) return AR_TO_EN.nav[value] as NavTabKey;
  if (value in AR_TO_EN.mobileNav) return AR_TO_EN.mobileNav[value] as NavTabKey;
  return 'home';
}

/**
 * Universal key-to-Arabic converter.
 * Converts any English key to its Arabic display label.
 * If the value is already in Arabic or unknown, returns it safely without crashing.
 *
 * Example:
 * `convertKeyToAr('available')` -> 'متاح'
 * `convertKeyToAr('متاح')` -> 'متاح'
 * `convertKeyToAr('beginner', 'courseLevels')` -> 'مبتدئ'
 */
export function convertKeyToAr(
  value?: string | null,
  category?: LocalizationCategory
): string {
  if (!value) return '';

  // If a specific category was provided, look there first
  if (category && category in EN_TO_AR) {
    const group = EN_TO_AR[category] as Record<string, string>;
    if (value in group) return group[value];
    // If it's already an Arabic value in this group, return as-is
    if (Object.values(group).includes(value)) return value;
  }

  // Universal flat lookup
  if (value in FLAT_EN_TO_AR) {
    return FLAT_EN_TO_AR[value];
  }

  // If already Arabic or custom text, return untouched
  return value;
}

/**
 * Universal Arabic-to-English converter.
 * Converts an Arabic label back to its canonical English key identifier.
 *
 * Example:
 * `convertArToKey('متاح')` -> 'available'
 * `convertArToKey('available')` -> 'available'
 */
export function convertArToKey(
  value?: string | null,
  category?: LocalizationCategory
): string {
  if (!value) return '';

  if (category && category in AR_TO_EN) {
    const group = AR_TO_EN[category];
    if (value in group) return group[value];
    // If it's already the English key, return as-is
    if (Object.values(group).includes(value)) return value;
  }

  if (value in FLAT_AR_TO_EN) {
    return FLAT_AR_TO_EN[value];
  }

  return value;
}
