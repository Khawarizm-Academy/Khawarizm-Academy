/**
 * Lesson → hosted-video slug mapping.
 *
 * The backend keys one hosted video by `slug`, and the ingest convention (see
 * `features/videohosting/README.md`) names it `<courseId>--<lessonId>`. The
 * player derives the same value here so a lesson and its stream never drift.
 *
 * Returns null when the course or lesson is unknown, so the stage can fall back
 * to the placeholder surface instead of requesting a video that cannot exist.
 */
export function videoHostingSlugFor(courseId: string | undefined, lessonId: string | undefined): string | null {
  if (!courseId || !lessonId) return null;
  return `${courseId}--${lessonId}`;
}
