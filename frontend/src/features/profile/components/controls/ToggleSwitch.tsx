import React from 'react';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange }) => (
  <div className="toggle-row">
    <span className="toggle-label">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`toggle-track ${checked ? 'toggle-track-on' : 'toggle-track-off'}`}
    >
      <span className={`toggle-knob ${checked ? 'toggle-knob-on' : 'toggle-knob-off'}`} />
    </button>
  </div>
);