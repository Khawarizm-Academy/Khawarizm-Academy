/** API shapes for the staff console: users, sessions, audit rows, analytics. */

import { DEVICE_LABELS, ROLE_LABELS, type AuthRole, type AuthUser } from '@/features/auth/types';

// The console renders roles and devices with the auth feature's Arabic labels.
export { DEVICE_LABELS, ROLE_LABELS };

/** One page of rows from a paginated admin endpoint. */
export interface Paged<T> {
  total: number;
  page: number;
  pageSize: number;
  results: T[];
}

/** The four generic content collections the console can manage. */
export type AdminContentTypeKey = 'courses' | 'scholarships' | 'events' | 'competitions';

/** The input a schema field maps onto; drives the generic form renderer. */
export type AdminFieldKind = 'text' | 'textarea' | 'url' | 'number' | 'decimal' | 'bool' | 'select' | 'json';

/** One `{value,label}` choice for a `select` field. */
export interface AdminFieldOption {
  value: string;
  label: string;
}

/** One editable field the schema describes; `name` is camelCase, `attr` the column. */
export interface AdminField {
  name: string;
  attr: string;
  label: string;
  kind: AdminFieldKind;
  required?: boolean;
  /** Set once at creation and never editable again (the account email). */
  readonly?: boolean;
  options?: AdminFieldOption[];
}

/** One managed content collection plus the fields its form renders. */
export interface AdminContentType {
  key: AdminContentTypeKey;
  label: string;
  keyField: string;
  titleField: string;
  fields: AdminField[];
}

/** One content row: stable id, business key, title, and every editable value. */
export interface AdminContentRow {
  id: string;
  key: string;
  title: string;
  values: Record<string, unknown>;
}

/** A paged page of content rows. */
export type AdminContentPage = Paged<AdminContentRow>;

/** The content registry the console renders its editor from. */
export interface AdminContentSchema {
  types: AdminContentType[];
  userFields: AdminField[];
}

/** The account payload a create or edit submits; `password` is create-only. */
export interface AdminUserInput {
  email: string;
  fullName?: string;
  phone?: string;
  role?: AuthRole;
  isActive?: boolean;
  membershipStatus?: string;
  language?: string;
  timezone?: string;
  password?: string;
}

/** Headline counters behind `GET /admin/overview`. */
export interface AdminOverview {
  users: { total: number; students: number; instructors: number; admins: number; newLast7Days: number };
  sessions: { active: number; total: number };
  activity: {
    loginsLast24h: number;
    loginsLast7d: number;
    rejectedLast7d: number;
    revocationsLast7d: number;
  };
  /** A counter per managed content collection. */
  content: Record<AdminContentTypeKey, number>;
}

/** One row of the users table. */
export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  role: AuthRole;
  isActive: boolean;
  isStaff: boolean;
  activeSessions: number;
  joinedAt: string;
  lastSeenAt: string | null;
}

/** The owner embedded in every admin session row. */
export interface AdminUserSummary {
  id: string;
  email: string;
  fullName: string;
  role: AuthRole;
}

/** One device footprint row across the whole fleet. */
export interface AdminSessionRow {
  id: string;
  os: string;
  browser: string;
  deviceType: string;
  deviceLabel: string;
  ipAddress: string;
  isActive: boolean;
  isCurrent: boolean;
  revokedReason: string;
  createdAt: string;
  lastSeenAt: string;
}

/** A session row plus the account that owns it. */
export interface AdminSessionWithUser extends AdminSessionRow {
  user: AdminUserSummary;
}

/** The five audit rows the backend records. */
export type AdminEventKind = 'login' | 'logout' | 'refresh' | 'revoked' | 'rejected';

/** One row of the global audit trail. */
export interface AdminEvent {
  id: string;
  kind: AdminEventKind;
  provider: string;
  email: string;
  deviceType: string;
  os: string;
  browser: string;
  ipAddress: string;
  detail: string;
  createdAt: string;
}

/** A user's own audit rows omit the email — the profile already shows it. */
export type AdminUserEvent = Omit<AdminEvent, 'email'>;

/** One user with their sessions and recent activity, for the detail panel. */
export interface AdminUserDetail {
  profile: AuthUser;
  sessions: AdminSessionRow[];
  events: AdminUserEvent[];
}

/** One bucket of a device breakdown. */
export interface DeviceCount {
  key: string;
  count: number;
}

export interface DeviceBreakdown {
  os: DeviceCount[];
  browser: DeviceCount[];
  deviceType: DeviceCount[];
}

/** One day of the login series. */
export interface LoginPoint {
  date: string;
  count: number;
}

export interface LoginSeries {
  days: number;
  points: LoginPoint[];
}

/** The console's sections; each one is a `?tab=` value. */
export type AdminSectionKey = 'overview' | 'users' | 'content' | 'videos' | 'sessions' | 'analytics' | 'activity';

export const ADMIN_SECTION_KEYS: AdminSectionKey[] = ['overview', 'users', 'content', 'videos', 'sessions', 'analytics', 'activity'];

/** Filter values shared by the tables. */
export type AdminRoleFilter = AuthRole | 'all';
export type AdminActiveFilter = 'all' | 'active' | 'inactive';
export type AdminLoginRange = '7' | '14' | '30';

/** Arabic labels for every section, event kind, and revoke reason. */
export const SECTION_LABELS: Record<AdminSectionKey, string> = {
  overview: 'نظرة عامة',
  users: 'المستخدمون',
  content: 'إدارة المحتوى',
  videos: 'استضافة الفيديو',
  sessions: 'الجلسات',
  analytics: 'التحليلات',
  activity: 'سجل النشاط',
};

export const EVENT_KIND_LABELS: Record<AdminEventKind, string> = {
  login: 'دخول',
  logout: 'خروج',
  refresh: 'تجديد',
  revoked: 'إبطال',
  rejected: 'مرفوض',
};

export const REVOKE_REASON_LABELS: Record<string, string> = {
  logout: 'سجّل الخروج',
  signed_in_elsewhere: 'دخل من جهاز آخر',
  expired: 'انتهت الصلاحية',
  revoked_by_admin: 'أُنهيت بالإدارة',
};

export interface AdminVideoProvider {
  code: string;
  name: string;
  enabled: boolean;
  isDefault?: boolean;
  capabilities?: Record<string, unknown>;
}

export interface AdminVideoAsset {
  id: string;
  slug: string;
  title: string;
  status: string;
  provider: string | null;
}
