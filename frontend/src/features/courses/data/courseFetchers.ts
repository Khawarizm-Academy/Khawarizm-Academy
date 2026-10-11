import { mockCatalogAll, type CatalogItem } from '@/shared/mocks/catalog';
import { mockCourseDetails, mockCourseProblems, type CourseDetailSeed } from '@/shared/mocks/courses';
import type { CourseDetail, CourseProblem } from '@/shared/types/entities';

/** Course language code to its Arabic label. */
const LANGUAGE_LABELS: Record<string, string> = {
  arabic: 'العربية',
  english: 'الإنجليزية',
  french: 'الفرنسية',
};

/** A tiny delay so the Tier 2 skeleton reflects real loading, never a fake timer. */
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Merges a course's catalog base with its landing seed into one detail record. */
function mergeCourseDetail(base: CatalogItem, seed: CourseDetailSeed): CourseDetail {
  return {
    id: base.id,
    title: base.title,
    category: base.category,
    categorySlug: base.categorySlug,
    thumbnailUrl: base.thumbnailUrl,
    tagline: seed.tagline,
    about: seed.about,
    instructorName: base.instructor ?? '',
    instructorCredential: seed.instructorCredential,
    instructorBio: seed.instructorBio,
    rating: base.rating ?? 0,
    reviewCount: seed.reviewCount,
    enrolledCount: seed.enrolledCount,
    duration: base.duration ?? '',
    lessonsCount: base.lessonsCount ?? 0,
    levelLabel: base.courseLevelAr ?? '',
    languageLabel: LANGUAGE_LABELS[base.language ?? 'arabic'] ?? '',
    priceType: base.priceType ?? 'free',
    priceLabel: base.priceLabel ?? '',
    outcomes: seed.outcomes,
    modules: seed.modules,
    liveSessions: seed.liveSessions,
    exam: seed.exam,
    relatedIds: seed.relatedIds,
  };
}

/** One course's full landing picture, or null when the slug is unknown. */
export async function fetchCourseDetail(slug: string): Promise<CourseDetail | null> {
  await pause(80);
  const base = mockCatalogAll.find((item) => item.id === slug && item.type === 'course');
  const seed = mockCourseDetails.find((detail) => detail.id === slug);
  if (!base || !seed) return null;
  return mergeCourseDetail(base, seed);
}

/** The resume lesson id for a course, read straight from its seed. */
export function getStartedLessonId(slug: string): string {
  return mockCourseDetails.find((detail) => detail.id === slug)?.startedLessonId ?? '';
}

/** Related course cards for the landing rail, same course grammar as the catalog. */
export async function fetchRelatedCourses(ids: string[]): Promise<CatalogItem[]> {
  await pause(40);
  return mockCatalogAll.filter((item) => item.type === 'course' && ids.includes(item.id));
}

/** The reusable practice set shown under a lesson's "حلّ المسائل" tab. */
export async function fetchCourseProblems(): Promise<CourseProblem[]> {
  await pause(40);
  return mockCourseProblems;
}
