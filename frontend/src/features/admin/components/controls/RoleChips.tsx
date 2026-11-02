import React from 'react';
import { Check, X } from 'lucide-react';
import type { AuthRoleSummary } from '@/features/auth/types';
import roleCopy from '@/features/admin/data/roleCopy.json';

interface RoleChipsProps {
  roles: AuthRoleSummary[];
  available?: AuthRoleSummary[];
  disabled?: boolean;
  onChange?: (roles: AuthRoleSummary[]) => void;
}

const sameRole = (left: AuthRoleSummary, right: AuthRoleSummary) => left.id === right.id || left.slug === right.slug;

/** Multi-role chips used by both the table and the account detail editor. */
export const RoleChips: React.FC<RoleChipsProps> = ({ roles, available = roles, disabled = false, onChange }) => (
  <div className="role-chips" aria-label={roleCopy.allRoles}>
    {available.map((role) => {
      const active = roles.some((item) => sameRole(item, role));
      return (
        <button
          key={role.id || role.slug}
          type="button"
          className={`role-chip ${active ? 'role-chip-active' : ''}`}
          aria-pressed={active}
          disabled={disabled || !onChange}
          onClick={() => onChange?.(active ? roles.filter((item) => !sameRole(item, role)) : [...roles, role])}
        >
          <span className="role-color-dot" style={{ backgroundColor: role.color }} aria-hidden="true" />
          <span>{role.name}</span>
          {active ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
        </button>
      );
    })}
  </div>
);
