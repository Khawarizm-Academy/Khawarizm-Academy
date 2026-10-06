/**
 * English-to-Arabic label lookup and reverse lookup for nav tabs, statuses,
 * levels, coverages, search types, and action buttons.
 */

import enToArJson from '../json/localization.json';

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

/** Shape of localization.json: every group is keyed by its domain key type. */
interface Dictionaries {
  nav: Record<NavTabKey, string>;
  mobileNav: Partial<Record<NavTabKey, string>>; // shorter labels for the bottom bar
  search: Record<SearchTypeKey, string>;
  courseLevels: Record<CourseLevelKey, string>;
  courseStatus: Record<CourseStatusKey, string>;
  coverage: Record<ScholarshipCoverageKey, string>;
  degreeLevels: Record<DegreeLevelKey, string>;
  eventFormats: Record<EventFormatKey, string>;
  actions: Record<ActionKey, string>;
}

/** Arabic labels live in localization.json; this cast gives them their key types. */
export const EN_TO_AR = enToArJson as unknown as Dictionaries;

export type LocalizationCategory = keyof typeof EN_TO_AR;

/** Arabic label back to its English key, per category. */
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

// Every category merged, for lookups without a category
const FLAT_EN_TO_AR: Record<string, string> = {};
const FLAT_AR_TO_EN: Record<string, string> = {};

for (const group of Object.values(EN_TO_AR) as Record<string, string>[]) {
  for (const [k, v] of Object.entries(group)) {
    FLAT_EN_TO_AR[k] = v;
    FLAT_AR_TO_EN[v] = k;
  }
}

/** Label for one key inside one category: toArabic('nav', 'home'). */
export function toArabic<
  C extends LocalizationCategory,
  K extends keyof (typeof EN_TO_AR)[C]
>(category: C, key: K): string {
  return EN_TO_AR[category][key] as unknown as string;
}

/** Nav tab label. The bottom bar uses its own shorter labels when it has one. */
export function toArabicNav(key: NavTabKey, isMobile = false): string {
  return (isMobile && EN_TO_AR.mobileNav[key]) || EN_TO_AR.nav[key];
}

/** Accepts either an English key or an Arabic label; anything else is 'home'. */
export function toEnglishNav(value?: string | null): NavTabKey {
  if (!value) return 'home';
  if (value in EN_TO_AR.nav) return value as NavTabKey;
  if (value in AR_TO_EN.nav) return AR_TO_EN.nav[value] as NavTabKey;
  if (value in AR_TO_EN.mobileNav) return AR_TO_EN.mobileNav[value] as NavTabKey;
  return 'home';
}

/** Any English key to its Arabic label. Arabic and unknown text pass through. */
export function convertKeyToAr(
  value?: string | null,
  category?: LocalizationCategory
): string {
  if (!value) return '';

  // A named category wins, then the flat map, then the text is already Arabic
  if (category && category in EN_TO_AR) {
    const group = EN_TO_AR[category] as Record<string, string>;
    if (value in group) return group[value];
    if (Object.values(group).includes(value)) return value;
  }

  return FLAT_EN_TO_AR[value] ?? value;
}

/** Any Arabic label back to its English key. English and unknown text pass through. */
export function convertArToKey(
  value?: string | null,
  category?: LocalizationCategory
): string {
  if (!value) return '';

  if (category && category in AR_TO_EN) {
    const group = AR_TO_EN[category];
    if (value in group) return group[value];
    if (Object.values(group).includes(value)) return value;
  }

  return FLAT_AR_TO_EN[value] ?? value;
}
