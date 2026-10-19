import React from 'react';

interface AdminToggleProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** A labeled switch for boolean schema fields. */
export const AdminToggle: React.FC<AdminToggleProps> = ({ label, checked, disabled = false, onChange }) => (
  <div className="admin-toggle-row">
    <span className="admin-toggle-label">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`admin-toggle-track ${checked ? 'admin-toggle-track-on' : 'admin-toggle-track-off'}`}
    >
      <span className={`admin-toggle-knob ${checked ? 'admin-toggle-knob-on' : 'admin-toggle-knob-off'}`} />
    </button>
  </div>
);
