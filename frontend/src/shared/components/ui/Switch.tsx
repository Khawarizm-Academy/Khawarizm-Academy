import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

/** Shared RTL-safe boolean switch used by profile, admin, studio. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled = false, label, size = 'md' }) => {
  const baseTrack = checked ? 'sw-track-on' : 'sw-track-off';
  const baseKnob = checked ? 'sw-knob-on' : 'sw-knob-off';
  const sizeClass = size === 'sm' ? 'sw-sm' : 'sw-md';

  return (
    <div className={`sw-row ${sizeClass}`} dir="ltr">
      {label && <span className="sw-label">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`sw-track ${baseTrack} ${disabled ? 'sw-disabled' : ''}`}
      >
        <span className={`sw-knob ${baseKnob}`} />
      </button>
    </div>
  );
};
