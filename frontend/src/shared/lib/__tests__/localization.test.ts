import {
  toArabic,
  toArabicNav,
  toEnglishNav,
  convertKeyToAr,
  convertArToKey,
} from '../localization';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runLocalizationTests(): boolean {
  // 1. Nav tab English to Arabic conversion
  assert(toArabicNav('home') === 'الرئيسية', 'home should convert to الرئيسية');
  assert(toArabicNav('courses') === 'الدورات', 'courses should convert to الدورات');
  assert(toArabicNav('scholarships') === 'المنح والفرص', 'scholarships should convert to المنح والفرص');
  assert(toArabicNav('scholarships', true) === 'المنح', 'mobile scholarships should convert to المنح');
  assert(toArabicNav('dashboard', true) === 'لوحتي', 'dashboard should convert to لوحتي');
  assert(toArabicNav('profile', true) === 'حسابي', 'profile should convert to حسابي');

  // 2. Nav tab Arabic to English normalization
  assert(toEnglishNav('الرئيسية') === 'home', 'الرئيسية should normalize to home');
  assert(toEnglishNav('الدورات') === 'courses', 'الدورات should normalize to courses');
  assert(toEnglishNav('المنح') === 'scholarships', 'المنح should normalize to scholarships');
  assert(toEnglishNav('home') === 'home', 'home should remain home');
  assert(toEnglishNav(undefined) === 'home', 'undefined should fallback to home');

  // 3. Category specific lookups
  assert(toArabic('search', 'course') === 'دورة', 'search course should be دورة');
  assert(toArabic('search', 'scholarship') === 'منحة', 'search scholarship should be منحة');
  assert(toArabic('actions', 'apply_now') === 'تقدم الآن', 'apply_now should be تقدم الآن');
  assert(toArabic('actions', 'course_details') === 'تفاصيل الدورة', 'course_details should be تفاصيل الدورة');
  assert(toArabic('actions', 'view_all') === 'عرض الكل', 'view_all should be عرض الكل');
  assert(toArabic('courseLevels', 'beginner') === 'مبتدئ', 'beginner should be مبتدئ');
  assert(toArabic('courseStatus', 'available') === 'متاح', 'available should be متاح');
  assert(toArabic('coverage', 'fully_funded') === 'ممولة بالكامل', 'fully_funded should be ممولة بالكامل');

  // 4. Universal converter functions
  assert(convertKeyToAr('available') === 'متاح', 'convertKeyToAr available should be متاح');
  assert(convertKeyToAr('متاح') === 'متاح', 'convertKeyToAr متاح should remain متاح');
  assert(convertKeyToAr('master', 'degreeLevels') === 'ماجستير', 'master should be ماجستير');
  assert(convertArToKey('متاح') === 'available', 'convertArToKey متاح should be available');
  assert(convertArToKey('تقدم الآن') === 'apply_now', 'convertArToKey تقدم الآن should be apply_now');

  return true;
}
