import React, { useState } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

interface ConfirmActionProps {
  /** Idle button text; leave empty for an icon-only button (set the label for a11y). */
  label: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: LucideIcon;
  busy?: boolean;
  disabled?: boolean;
  tone?: 'danger' | 'gold';
  onConfirm: () => void;
}

/** Inline two-step confirm: the first click reveals confirm/cancel, no browser dialog. */
export const ConfirmAction: React.FC<ConfirmActionProps> = ({
  label,
  confirmLabel,
  cancelLabel = 'إلغاء',
  icon: Icon,
  busy = false,
  disabled = false,
  tone = 'danger',
  onConfirm,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const btnClass = tone === 'danger' ? 'admin-danger-btn' : 'admin-primary-btn';

  if (isConfirming) {
    return (
      <span className="admin-confirm">
        <button type="button" className={btnClass} disabled={busy} onClick={onConfirm}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : Icon && <Icon size={14} />}
          <span>{confirmLabel}</span>
        </button>
        <button
          type="button"
          className="admin-ghost-btn"
          disabled={busy}
          onClick={() => setIsConfirming(false)}
        >
          {cancelLabel}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={btnClass}
      disabled={disabled}
      aria-label={label || confirmLabel}
      onClick={() => setIsConfirming(true)}
    >
      {Icon && <Icon size={14} />}
      {label && <span>{label}</span>}
    </button>
  );
};
