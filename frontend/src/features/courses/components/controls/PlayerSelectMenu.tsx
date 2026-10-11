import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PlayerSelectMenuProps {
  icon: LucideIcon;
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
}

/** Video-tool dropdown (speed, quality): one button + a small option popover. */
export const PlayerSelectMenu: React.FC<PlayerSelectMenuProps> = ({
  icon: Icon,
  label,
  value,
  options,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button type="button" className="player-tool" aria-label={label} onClick={() => setIsOpen((open) => !open)}>
        <Icon size={15} />
        <span className="text-[10px] font-bold tabular-nums">{value}</span>
      </button>

      {isOpen && (
        <div className="player-speed-menu">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
              className={option === value ? 'player-speed-option player-speed-option-active' : 'player-speed-option'}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};