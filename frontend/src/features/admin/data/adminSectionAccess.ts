import { ADMIN_SECTIONS, type AdminSectionKey } from '@/features/admin/types';
import type { AuthUser } from '@/features/auth/types';
import { can } from '@/shared/lib/permissions';

export const allowedSectionsFor = (actor: AuthUser | null): Set<AdminSectionKey> =>
  new Set(ADMIN_SECTIONS.filter((section) => can(actor, section.permission)).map((section) => section.key));

export const canAccessAdminSection = (actor: AuthUser | null, section: AdminSectionKey): boolean =>
  can(actor, ADMIN_SECTIONS.find((item) => item.key === section)?.permission ?? 'admin.access');
