import React from 'react';
import { Switch } from '@/shared/components/ui/Switch';

interface AdminToggleProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** A labeled switch for boolean schema fields. */
export const AdminToggle: React.FC<AdminToggleProps> = ({ label, checked, disabled = false, onChange }) => (
  <Switch label={label} checked={checked} disabled={disabled} onChange={onChange} />
);
