import React from 'react';
import { DASHBOARD_SUB_NAV } from '../../../shared/lib/navigation';

interface DashboardSubNavigationProps {
  activeView: string;
  onSelectView: (viewId: string) => void;
  className?: string;
}

export const DashboardSubNavigation: React.FC<DashboardSubNavigationProps> = ({
  activeView,
  onSelectView,
  className = '',
}) => {
  return (
    <div
      dir="rtl"
      role="tablist"
      aria-label="التنقل الداخلي للوحة التحكم"
      className={`dash-subnav ${className}`}
    >
      {DASHBOARD_SUB_NAV.map((tab) => {
        const isActive = tab.activeViews.includes(activeView);

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectView(tab.id)}
            className={`dash-tab ${isActive ? 'dash-pill-active' : 'dash-tab-idle'}`}
          >
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
