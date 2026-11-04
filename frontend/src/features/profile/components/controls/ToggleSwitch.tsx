import React from 'react';
import { Switch } from '@/shared/components/ui/Switch';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange }) => (
  <Switch label={label} checked={checked} onChange={() => onChange()} />
);