import React from 'react';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-slate-200 text-xs sm:text-sm font-normal font-['Tajawal'] select-none">
      {label}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 outline-none focus:ring-2 focus:ring-sky-400/40 ${
        checked ? 'bg-[#29A9FF]' : 'bg-[#1B3F80]'
      }`}
    >
      <span
        className={`block size-5 bg-white rounded-full shadow-md transition-transform ${
          checked ? '-translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);