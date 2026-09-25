import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface FieldSelectProps {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export const FieldSelect: React.FC<FieldSelectProps> = ({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  options,
}) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={id} className="text-slate-300 text-xs font-medium font-['Tajawal']">
      {label}
    </label>
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field pl-10 appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Icon
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
      />
    </div>
  </div>
);