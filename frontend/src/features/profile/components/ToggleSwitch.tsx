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
      className={`w-11 h-6 rounded-full transition-all duration-300 relative cursor-pointer shrink-0 p-0.5 outline-none focus:ring-2 focus:ring-sky-400/40 active:scale-95 ${
        checked
          ? 'bg-[#29A9FF] shadow-[0_0_10px_rgba(41,169,255,0.5)]'
          : 'bg-[#1B3F80]'
      }`}
    >
      <span
        className={`block size-5 bg-white rounded-full shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          checked ? '-translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);