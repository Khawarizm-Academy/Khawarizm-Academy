/** Shared time math for the video player and its mini-player. */

/** Parses a lesson's 'MM:SS' duration into milliseconds (10:00 fallback). */
export function lessonDurationMs(duration: string): number {
  const [minutes, seconds] = duration.split(':').map(Number);
  if (Number.isFinite(minutes) && Number.isFinite(seconds)) return (minutes * 60 + seconds) * 1000;
  return 600 * 1000;
}

/** Formats milliseconds as a 'M:SS' wall-clock label. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
