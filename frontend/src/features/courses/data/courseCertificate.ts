import type { CourseModule } from '@/shared/types/entities';
import { flattenLessons } from '@/features/courses/data/coursePath';

/** Training hours from the modules' own lesson durations, rounded to one decimal. */
export function courseTrainingHours(modules: CourseModule[]): number {
  const totalMinutes = flattenLessons(modules).reduce((sum, lesson) => {
    const [minutes, seconds] = lesson.duration.split(':').map(Number);
    const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
    const safeSeconds = Number.isFinite(seconds) ? seconds / 60 : 0;
    return sum + safeMinutes + safeSeconds;
  }, 0);
  return Math.max(1, Math.round((totalMinutes / 60) * 10) / 10);
}

/** Deterministic certificate serial so the mock never changes between visits. */
export function certificateSerial(slug: string): string {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000;
  return `KA-2026-${String(hash).padStart(6, '0')}`;
}