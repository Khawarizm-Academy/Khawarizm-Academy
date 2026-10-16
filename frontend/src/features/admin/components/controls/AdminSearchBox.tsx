import React from 'react';
import { Search, X } from 'lucide-react';

interface AdminSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}

/** Debounce-free console search: the provider resets paging on every change. */
export const AdminSearchBox: React.FC<AdminSearchBoxProps> = ({ value, onChange, placeholder, label }) => (
  <label className="admin-search">
    <Search size={16} className="admin-search-icon" aria-hidden="true" />
    <input
      type="search"
      className="admin-search-input"
      value={value}
      placeholder={placeholder}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
    />
    {value && (
      <button type="button" className="admin-search-clear" aria-label="امسح البحث" onClick={() => onChange('')}>
        <X size={14} />
      </button>
    )}
  </label>
);
