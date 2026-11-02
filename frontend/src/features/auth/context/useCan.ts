import { useAuth } from '@/features/auth/context/authContext';
import { can, canAny, type PermissionKey } from '@/shared/lib/permissions';

/** Read the current account's permission state from auth context. */
export function useCan(permission: PermissionKey): boolean {
  const { user } = useAuth();
  return can(user, permission);
}

/** Read whether the current account has at least one requested permission. */
export function useCanAny(permissions: PermissionKey | readonly PermissionKey[]): boolean {
  const { user } = useAuth();
  return canAny(user, permissions);
}
