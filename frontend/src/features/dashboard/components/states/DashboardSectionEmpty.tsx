import React from 'react';

interface DashboardSectionEmptyProps {
  icon: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}

/** Compact in-section empty chamber: icon, title, message and optional action. */
export const DashboardSectionEmpty: React.FC<DashboardSectionEmptyProps> = ({
  icon,
  title,
  text,
  action,
}) => (
  <div dir="rtl" className="dash-empty-sm">
    <div className="dash-empty-sm-icon">{icon}</div>
    <h3 className="dash-empty-sm-title">{title}</h3>
    {text && <p className="dash-empty-sm-text">{text}</p>}
    {action}
  </div>
);
