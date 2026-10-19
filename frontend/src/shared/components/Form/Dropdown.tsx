import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Portal } from '@/shared/components/Overlays/Portal';

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

/** Option capsule classes for its three visual states. */
const OPTION_TONE = {
  selected: 'dropdown-option dropdown-option-selected',
  active: 'dropdown-option dropdown-option-active',
  idle: 'dropdown-option dropdown-option-idle',
} as const;

/** Trigger value tone: a chosen option or the muted placeholder. */
const VALUE_TONE = {
  selected: 'dropdown-value dropdown-value-selected',
  placeholder: 'dropdown-value dropdown-value-placeholder',
} as const;

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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });
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

  const updatePanelPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const onScroll = () => updatePanelPosition();
    const onResize = () => updatePanelPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node) && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
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
    <div ref={rootRef} className={`dropdown-root ${className}`}>
      {label && <span className="dropdown-label">{label}</span>}

      <button
        type="button"
        id={id}
        ref={buttonRef}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id ?? 'dropdown'}-listbox`}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        onKeyDown={handleKeyDown}
        aria-label={typeof label === 'string' ? label : undefined}
        className="input-field dropdown-trigger"
      >
        {Icon && <Icon size={16} className="dropdown-leading" />}
        <span className={selected ? VALUE_TONE.selected : VALUE_TONE.placeholder}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`dropdown-chevron ${open ? 'dropdown-chevron-on' : ''}`}
        />
      </button>

      {visible && (
        <Portal>
          <div
            ref={panelRef}
            id={`${id ?? 'dropdown'}-listbox`}
            role="listbox"
            tabIndex={-1}
            className={`dropdown-panel ${open ? 'animate-dropdown-in' : 'animate-dropdown-out'}`}
            style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, width: panelPos.width, zIndex: 9999 }}
          >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isActive = idx === activeIndex && open;
            const stateKey = isSelected ? 'selected' : isActive ? 'active' : 'idle';
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
                className={OPTION_TONE[stateKey]}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={16} className="dropdown-check" />}
              </button>
            );
          })}
          </div>
        </Portal>
      )}
    </div>
  );
};
