/** API shapes for the staff console: users, sessions, audit rows, analytics. */

import { DEVICE_LABELS, ROLE_LABELS, type AuthRole, type AuthUser } from '@/features/auth/types';
import type { PermissionKey } from '@/shared/lib/permissions';
import adminSectionsJson from '@/features/admin/data/adminSections.json';

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
export type AdminFieldKind = 'text' | 'textarea' | 'url' | 'number' | 'decimal' | 'bool' | 'select' | 'json' | 'user_ref';

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
  avatarUrl: string;
  role: AuthRole;
  roles?: AuthUser['roles'];
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
  avatarUrl: string;
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
export type AdminSectionKey = 'overview' | 'users' | 'content' | 'videos' | 'system' | 'sessions' | 'analytics' | 'activity' | 'roles' | 'audit';
export interface AdminSectionDefinition {
  key: AdminSectionKey;
  label: string;
  icon: string;
  group: string;
  permission: PermissionKey;
}
export const ADMIN_SECTIONS = adminSectionsJson as AdminSectionDefinition[];
/** Backwards-compatible grouped view; the source of truth is adminSections.json. */
export interface AdminNavGroup { id: string; label: string; sections: AdminSectionKey[]; }
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = Array.from(
  ADMIN_SECTIONS.reduce((groups, section) => {
    const current = groups.get(section.group) ?? [];
    current.push(section.key);
    groups.set(section.group, current);
    return groups;
  }, new Map<string, AdminSectionKey[]>())
).map(([label, sections]) => ({ id: label, label, sections }));
export const ADMIN_SECTION_KEYS: AdminSectionKey[] = ADMIN_SECTIONS.map((section) => section.key);
/** The h1 + one-line description under every section name. */
export const SECTION_DETAILS: Record<AdminSectionKey, { title: string; sub: string }> = {
  overview: { title: 'نظرة عامة', sub: 'مؤشرات المنصة لحظة بلحظة: الحسابات والجلسات ونشاط الدخول.' },
  users: { title: 'الحسابات', sub: 'كل حساب مسجّل مع دوره وحالته — افتح الحساب لتعديل بياناته أو إدارة أجهزته.' },
  content: { title: 'إدارة المحتوى', sub: 'الدورات والمنح والفعاليات والمسابقات — إضافة وتعديل وأرشفة من مكان واحد.' },
  videos: { title: 'استضافة الفيديو', sub: 'أصول الفيديو المخزّنة، وخط الرفع والتغليف الذي يشغّلها داخل المنصة.' },
  system: { title: 'فحص المنظومة', sub: 'صحة خط التغليف واتصال مُزوّدي الاستضافة قبل اعتمادها للطلاب.' },
  sessions: { title: 'الجلسات', sub: 'كل الأجهزة التي دخلت على المنصة، مع إنهاء أي جلسة عن بُعد.' },
  analytics: { title: 'التحليلات', sub: 'تسجيلات الدخول اليومية وتوزيع أجهزة الجمهور عبر الإطار الزمني.' },
  activity: { title: 'سجل النشاط', sub: 'أحدث أحداث الدخول والخروج والتجديد والإبطال على مستوى المنصة.' },
  roles: { title: 'الأدوار والصلاحيات', sub: 'أنشئ أدوارًا واضحة، اضبط صلاحياتها، ووزّعها بأمان على الحسابات.' },
  audit: { title: 'سجل التدقيق', sub: 'تتبّع تغييرات الأدوار والصلاحيات وإسنادها مع فروق مفهومة.' },
};
/** Arabic labels come from the same data registry. */
export const SECTION_LABELS: Record<AdminSectionKey, string> = Object.fromEntries(
  ADMIN_SECTIONS.map((section) => [section.key, section.label])
) as Record<AdminSectionKey, string>;
export const EVENT_KIND_LABELS: Record<AdminEventKind, string> = {
  login: 'دخول',
  logout: 'خروج',
  refresh: 'تجديد',
  revoked: 'إبطال',
  rejected: 'مرفوض',
};

/** Filter values shared by the tables. */
export type AdminRoleFilter = AuthRole | 'all';
export type AdminActiveFilter = 'all' | 'active' | 'inactive';
export type AdminLoginRange = '7' | '14' | '30';

/** The option lists every segmented filter renders; ids are the API's own values. */
export const ROLE_FILTERS: Array<{ id: AdminRoleFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'student', label: 'طلاب' },
  { id: 'instructor', label: 'مدربون' },
  { id: 'admin', label: 'مشرفون' },
];

export const ACTIVE_FILTERS: Array<{ id: AdminActiveFilter; label: string }> = [
  { id: 'all', label: 'كل الجلسات' },
  { id: 'active', label: 'نشطة الآن' },
  { id: 'inactive', label: 'منتهية' },
];

export const LOGIN_RANGES: Array<{ id: AdminLoginRange; label: string }> = [
  { id: '7', label: 'آخر ٧ أيام' },
  { id: '14', label: 'آخر ١٤ يومًا' },
  { id: '30', label: 'آخر ٣٠ يومًا' },
];

export const EVENT_KIND_FILTERS: Array<{ id: AdminEventKind | 'all'; label: string }> = [
  { id: 'all', label: 'كل الأحداث' },
  ...(['login', 'logout', 'refresh', 'revoked', 'rejected'] as AdminEventKind[]).map((kind) => ({
    id: kind,
    label: EVENT_KIND_LABELS[kind],
  })),
];

/** Arabic labels for every section, event kind, and revoke reason. */
export const REVOKE_REASON_LABELS: Record<string, string> = {
  logout: 'سجّل الخروج',
  signed_in_elsewhere: 'دخل من جهاز آخر',
  expired: 'انتهت الصلاحية',
  revoked_by_admin: 'أُنهيت بالإدارة',
};

/** Arabic labels for the hosted-video lifecycle, mirrored from VideoStatus. */
export const VIDEO_STATUS_LABELS: Record<string, string> = {
  uploading: 'قيد الرفع',
  processing: 'قيد التغليف',
  ready: 'جاهز',
  staged: 'مرحَّل — بانتظار التغليف',
  error: 'فشل',
};

/** The tracker's second line: what the ingest worker is busy with right now. */
export const VIDEO_STAGE_LABELS: Record<string, string> = {
  uploading: 'رفع المصدر',
  packaging: 'تغليف HLS',
  publishing: 'رفع المقاطع',
};

export type RoleTemplateKey = 'instructor' | 'senior_instructor' | 'teaching_assistant' | 'content_moderator' | 'support_agent' | 'content_manager';
export interface RolePermission { key: PermissionKey; label: string; description: string; elevated: boolean; implies: PermissionKey[]; }
export interface RolePermissionGroup { key: string; label: string; permissions: RolePermission[]; }
export interface RoleTemplate { key: RoleTemplateKey; label: string; description: string; permissions: PermissionKey[]; }
export interface RoleCatalog { groups: RolePermissionGroup[]; templates: RoleTemplate[]; colors: string[]; }
export interface AdminRole { id: string; slug: string; name: string; description: string; color: string; position: number; permissions: PermissionKey[]; isSystem: boolean; isDefault: boolean; templateKey?: RoleTemplateKey | null; memberCount: number; canManage: boolean; createdAt: string; updatedAt: string; }
export interface RoleMember { id: string; email: string; fullName: string; avatarUrl?: string; roles: Array<{ id: string; slug: string; name: string; color: string }>; isActive?: boolean; }
export type RoleMembersPage = Paged<RoleMember>;
export interface AuditRow { id: string; action: string; actor: { id: string; name: string; email?: string } | null; targetType: string; targetId: string; targetName?: string; detail: { before?: Record<string, unknown>; after?: Record<string, unknown>; added?: string[]; removed?: string[] } | string; createdAt: string; }
export type AuditPage = Paged<AuditRow>;
export interface RoleCreateInput { name: string; slug?: string; color: string; description?: string; permissions: PermissionKey[]; templateKey?: RoleTemplateKey; }

/** `GET/POST /admin/video-system-config` — global toggles, e.g. FFmpeg packaging. */
export interface AdminVideoSystemConfig {
  /** When false, uploads skip HLS packaging and are served raw from the provider. */
  useFfmpeg: boolean;
}

export type AdminVideoProviderKind = 'storage' | 'link';
export type AdminVideoPackagingPolicy = 'auto' | 'always' | 'never';

export interface AdminVideoProvider {
  code: string;
  name: string;
  kind: AdminVideoProviderKind;
  needs: string[];
  packagingPolicy: AdminVideoPackagingPolicy;
  enabled: boolean;
  isDefault?: boolean;
  capabilities?: Record<string, unknown>;
  /** The provider's own env checks pass — the select-enable verdict. */
  available?: boolean;
  /** Why the provider is greyed out, in Arabic; empty when available. */
  reason?: string;
}

export interface AdminVideoAsset {
  id: string;
  slug: string;
  title: string;
  status: string;
  provider: string | null;
  /** Live ingest percent 0-100 while the upload worker runs. */
  progress?: number;
  /** uploading | packaging | publishing — see VIDEO_STAGE_LABELS. */
  stage?: string;
  /** Truncated failure message when the asset errored. */
  error?: string;
  /** Packaged renditions on the asset (0 while staged). */
  qualities?: number;
  /** How many watch grants were minted — the asset's view ledger. */
  viewCount?: number;
  /** When the platform last served a watch link, null before the first watch. */
  lastViewedAt?: string | null;
  createdAt?: string;
}

/** The create-asset payload keyed by slug, with an optional provider verdict gate. */
export interface AdminVideoInput {
  slug: string;
  title?: string;
  provider?: string;
}

// ---------------------------------------------------------------- diagnostics
// Mirrors `GET /admin/video-diagnostics` — one staged check per thing that can
// silently break video playback, so an admin sees WHY it is not working.

/** How bad a failing check is: blocking, degraded-but-usable, or just noise. */
export type DiagnosticSeverity = 'info' | 'warn' | 'error';

/** One named validation with its reason and the fix when it fails. */
export interface AdminDiagnosticCheck {
  id: string;
  label: string;
  ok: boolean;
  severity: DiagnosticSeverity;
  detail: string;
  /** The actionable next step; empty for passing checks. */
  hint: string;
}

/** A provider or the packaging pipeline, with its staged checks. */
export interface AdminDiagnosticGroup {
  id: string;
  label: string;
  /** The provider code, or "" for the packaging pipeline. */
  provider: string;
  ok: boolean;
  warningCount: number;
  checks: AdminDiagnosticCheck[];
}

/** One provider row: the same group body plus the select-enable verdict. */
export interface AdminDiagnosticProvider extends AdminDiagnosticGroup {
  code: string;
  available: boolean;
  reason: string;
}

/** The full staged validation payload. */
export interface AdminVideoDiagnostics {
  checkedAt: string;
  /** True when live provider APIs were called, not just the environment. */
  deep: boolean;
  okOverall: boolean;
  summary: { pipeline: boolean; telegram: boolean; google_drive: boolean };
  /** One Arabic string per blocking failure, for the banner. */
  problems: string[];
  groups: AdminDiagnosticGroup[];
  providers: AdminDiagnosticProvider[];
}
