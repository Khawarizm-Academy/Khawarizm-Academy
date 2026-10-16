import React from 'react';
import { ROLE_LABELS } from '@/features/admin/types';
import type { AuthRole } from '@/features/auth/types';

const ROLE_OPTIONS: AuthRole[] = ['student', 'instructor', 'admin'];

interface RoleSelectProps {
  value: AuthRole;
  disabled?: boolean;
  onChange: (role: AuthRole) => void;
}

/** Promote/demote in place; the owner's own row stays read-only. */
export const RoleSelect: React.FC<RoleSelectProps> = ({ value, disabled = false, onChange }) => (
  <select
    className="admin-select"
    value={value}
    disabled={disabled}
    aria-label="دور المستخدم"
    onClick={(event) => event.stopPropagation()}
    onChange={(event) => onChange(event.target.value as AuthRole)}
  >
    {ROLE_OPTIONS.map((role) => (
      <option key={role} value={role}>
        {ROLE_LABELS[role]}
      </option>
    ))}
  </select>
);
