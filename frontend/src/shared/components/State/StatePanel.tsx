import React from 'react';

type StateTone = 'neutral' | 'danger';

interface StatePanelProps {
  title: string;
  text?: string;
  icon?: React.ReactNode;
  tone?: StateTone;
  action?: React.ReactNode;
}

/** Icon-circle tone: calm navy, or a red alert for failures. */
const ICON_TONE: Record<StateTone, string> = {
  neutral: 'state-panel-icon',
  danger: 'state-panel-icon text-red-500',
};

/** Shared empty / error chamber: icon, title, message and optional action. */
export const StatePanel: React.FC<StatePanelProps> = ({
  title,
  text,
  icon,
  tone = 'neutral',
  action,
}) => {
  return (
    <div className="state-panel">
      {icon && <div className={ICON_TONE[tone]}>{icon}</div>}
      <h3 className="state-panel-title">{title}</h3>
      {text && <p className="state-panel-text">{text}</p>}
      {action}
    </div>
  );
};
