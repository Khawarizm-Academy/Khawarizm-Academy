import mockJson from '@/shared/json/mockCatalog.json';

export interface CatalogItem {
  id: string;
  type: 'course' | 'scholarship';
  title: string;
  category: string;
  categorySlug: 'ai' | 'programming' | 'cybersecurity' | 'space' | 'cs';
  thumbnailUrl: string;
  // Course specific
  rating?: number;
  duration?: string;
  lessonsCount?: number;
  instructor?: string;
  courseLevel?: 'beginner' | 'intermediate' | 'advanced';
  courseLevelAr?: string;
  priceType?: 'free' | 'paid';
  priceLabel?: string;
  progressBadge?: string;
  // Scholarship specific
  country?: string;
  countrySlug?: 'saudi' | 'usa' | 'turkey' | 'uk' | 'germany';
  degreeLevel?: 'bachelor' | 'master' | 'phd';
  degreeLabel?: string;
  provider?: string;
  coverageType?: 'fully_funded' | 'partial';
  coverageLabel?: string;
  daysRemaining?: number;
  deadlineBadge?: string;
  deadlineUrgency?: 'critical' | 'warning' | 'normal';
  status?: 'open' | 'closing_soon' | 'closed';
  language?: 'arabic' | 'english' | 'french';
}

/** Mock records live in JSON; the type above is what JSON cannot carry. */
export const mockCatalogCourses = mockJson.courses as CatalogItem[];
export const mockCatalogScholarships = mockJson.scholarships as CatalogItem[];

/** Courses and scholarships interleaved, so the catalog shows both kinds together. */
export const mockCatalogAll: CatalogItem[] = mockCatalogCourses.flatMap((course, index) => [
  course,
  mockCatalogScholarships[index],
]);
