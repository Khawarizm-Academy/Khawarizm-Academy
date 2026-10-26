/** Display helpers shared by every console view: timestamps, counts, initials. */

import { Activity, Video, BookOpen, CalendarDays, Globe, GraduationCap, HeartPulse, LayoutDashboard, LayoutList, LogIn, LogOut, MonitorSmartphone, ShieldCheck, TrendingUp, Trophy, UserPlus, Users, type LucideIcon } from 'lucide-react';
import type { AdminSectionKey } from '@/features/admin/types';

/** One icon per section; the rail, the pills, and the header all read this map. */
export const SECTION_ICONS: Record<AdminSectionKey, LucideIcon> = {
  overview: LayoutDashboard,
  users: Users,
  content: LayoutList,
  sessions: MonitorSmartphone,
  analytics: TrendingUp,
  activity: Activity,
  videos: Video,
  system: HeartPulse,
};

/** Icons the overview cards use, keyed by the card's metric name. */
export const METRIC_ICONS: Record<string, LucideIcon> = {
  total: Users,
  students: Users,
  instructors: Users,
  admins: ShieldCheck,
  newLast7Days: UserPlus,
  active: MonitorSmartphone,
  sessionsTotal: Globe,
  loginsLast24h: LogIn,
  loginsLast7d: CalendarDays,
  rejectedLast7d: TrendingUp,
  revocationsLast7d: LogOut,
  courses: BookOpen,
  scholarships: GraduationCap,
  events: CalendarDays,
  competitions: Trophy,
};

/** Arabic-grouped integer so console counters match the rest of the app. */
export const formatCount = (value: number): string => value.toLocaleString('ar-EG');

/** Compact timestamp: `16 أكتوبر 2026، 9:41 م`. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Analytics bucket label: `16 أكت`. */
export function formatDayLabel(isoDay: string): string {
  const parsed = new Date(`${isoDay}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDay;
  return parsed.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

/** Last activity that explains itself when the account never signed in. */
export const formatLastSeen = (iso: string | null | undefined): string =>
  iso ? formatDateTime(iso) : 'لم يسجّل الدخول بعد';

/** Compact date-time for dense table cells: `16/10، 9:41 م`. */
export function formatShortDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
}

/** Compact last-activity cell so a table row never wraps to three lines. */
export const formatLastSeenShort = (iso: string | null | undefined): string =>
  iso ? formatShortDateTime(iso) : 'لم يسجّل الدخول';

/** Two-letter monogram for the avatar bubbles. */
export function initialsOf(fullName: string, fallback: string): string {
  const names = fullName.trim().split(/\s+/).filter(Boolean);
  if (names.length === 0) return fallback || '؟';
  if (names.length === 1) return names[0].slice(0, 2);
  return `${names[0][0]}${names[names.length - 1][0]}`;
}
