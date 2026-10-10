import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface FieldTextProps {
  id: string;
  label: React.ReactNode;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  dir?: 'rtl' | 'ltr';
  textLeft?: boolean;
  iconPosition?: 'left' | 'right';
  required?: boolean;
}

export const FieldText: React.FC<FieldTextProps> = ({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  dir,
  textLeft = false,
  iconPosition = 'left',
  required,
}) => (
  <div className="profile-field">
    <label htmlFor={id} className="profile-label">
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        type={type}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`input-field peer ${iconPosition === 'left' ? 'pl-10' : 'pr-10'} ${textLeft ? 'text-left' : ''}`}
      />
      <Icon
        size={16}
        className={`profile-field-icon ${iconPosition === 'left' ? 'left-3.5' : 'right-3.5'}`}
      />
    </div>
  </div>
);