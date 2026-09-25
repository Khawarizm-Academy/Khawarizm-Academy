import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label?: React.ReactNode;
  icon?: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  id?: string;
  placeholder?: string;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  id,
  placeholder = 'اختر من القائمة',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const selected = options.find((o) => o.value === value);

  const openDropdown = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setVisible(true);
    setOpen(true);
  };

  const closeDropdown = () => {
    setOpen(false);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setVisible(false), 140);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeDropdown();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(options.findIndex((o) => o.value === value));
        openDropdown();
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        closeDropdown();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0 && options[activeIndex]) {
          onChange(options[activeIndex].value);
          closeDropdown();
        }
        break;
      case 'Tab':
        closeDropdown();
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative flex flex-col gap-2 ${className}`}>
      {label && (
        <span className="text-slate-300 text-xs font-medium font-['Tajawal']">{label}</span>
      )}

      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id ?? 'dropdown'}-listbox`}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        onKeyDown={handleKeyDown}
        aria-label={typeof label === 'string' ? label : undefined}
        className="input-field flex items-center gap-2.5 cursor-pointer text-right"
      >
        {Icon && <Icon size={16} className="shrink-0 text-slate-500" />}
        <span
          className={`flex-1 truncate ${
            selected ? 'text-slate-100' : 'text-slate-500'
          }`}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-500 transition-transform duration-300 ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {visible && (
        <div
          id={`${id ?? 'dropdown'}-listbox`}
          role="listbox"
          tabIndex={-1}
          className={`absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-60 overflow-y-auto p-1.5 bg-slate-950 border border-blue-900/70 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6),0_0_24px_rgba(41,169,255,0.08)] ${
            open ? 'animate-dropdown-in' : 'animate-dropdown-out'
          }`}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isActive = idx === activeIndex && open;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onChange(opt.value);
                  closeDropdown();
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 text-sm font-['Tajawal'] transition-colors cursor-pointer text-right ${
                  isSelected
                    ? 'bg-slate-900 outline outline-1 outline-sky-400/60 text-white font-bold'
                    : isActive
                      ? 'bg-slate-800/80 text-slate-100'
                      : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={16} className="shrink-0 text-sky-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};