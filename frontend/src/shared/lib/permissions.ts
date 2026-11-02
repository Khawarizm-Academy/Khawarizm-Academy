/** Canonical permission keys mirrored from the backend access registry. */
export const PERMISSION_KEYS = [
  'administrator',
  'admin.access',
  'studio.access',
  'courses.enroll',
  'courses.favorite',
  'lessons.watch',
  'quizzes.attempt',
  'certificates.view_own',
  'reviews.write',
  'scholarships.save',
  'scholarships.apply',
  'competitions.join',
  'events.register',
  'profile.edit_own',
  'discussions.post',
  'discussions.reply_own',
  'discussions.moderate',
  'reviews.reply_own',
  'courses.create',
  'courses.edit_own',
  'courses.edit_any',
  'courses.delete_own',
  'courses.delete_any',
  'courses.submit_for_review',
  'courses.publish',
  'courses.review',
  'courses.manage_staff',
  'curriculum.edit_own',
  'curriculum.edit_any',
  'live_sessions.manage_own',
  'live_sessions.manage_any',
  'announcements.post',
  'certificates.manage',
  'reviews.moderate',
  'students.view_own',
  'students.view_any',
  'analytics.view_own',
  'analytics.view_any',
  'videos.upload',
  'videos.manage_own',
  'videos.manage_any',
  'videos.use_embed',
  'videos.package',
  'videos.watch_any',
  'videos.configure',
  'quizzes.create',
  'quizzes.edit_own',
  'quizzes.edit_any',
  'quizzes.results_own',
  'quizzes.results_any',
  'quizzes.reset_attempts',
  'scholarships.manage',
  'events.manage',
  'competitions.manage',
  'catalog.manage',
  'home.curate',
  'users.view',
  'users.create',
  'users.edit',
  'users.delete',
  'users.assign_roles',
  'users.revoke_sessions',
  'sessions.view_any',
  'analytics.view_platform',
  'audit.view',
  'roles.view',
  'roles.manage',
  'system.maintenance',
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

/** The minimum permission-bearing shape accepted by shared authorization helpers. */
export interface PermissionSubject {
  isAdministrator?: boolean;
  permissions?: readonly PermissionKey[];
}

/** Return whether a user has one permission, with administrator bypass. */
export function can(user: PermissionSubject | null | undefined, permission: PermissionKey): boolean {
  if (!user) return false;
  if (user.isAdministrator) return true;
  return user.permissions?.includes(permission) ?? false;
}

/** Return whether a user has at least one permission in the requested set. */
export function canAny(
  user: PermissionSubject | null | undefined,
  permissions: PermissionKey | readonly PermissionKey[],
): boolean {
  const required = Array.isArray(permissions) ? permissions : [permissions];
  return required.some((permission) => can(user, permission));
}
