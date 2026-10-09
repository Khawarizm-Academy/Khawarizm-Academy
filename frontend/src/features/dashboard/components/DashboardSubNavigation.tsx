import React from 'react';
import { DASHBOARD_SUB_NAV } from '../../../shared/lib/navigation';
import { SlidingSegmentedControl } from '../../../shared/components/Controls/SlidingSegmentedControl';

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
  // Aliases like ?view=live (main) or ?view=courses (enrolled) resolve to a tab id.
  const activeId =
    DASHBOARD_SUB_NAV.find((tab) => tab.activeViews.includes(activeView))?.id ?? activeView;

  return (
    <SlidingSegmentedControl
      options={DASHBOARD_SUB_NAV.map((tab) => ({ id: tab.id, label: tab.label }))}
      value={activeId}
      onChange={onSelectView}
      tone="blue"
      aria-label="التنقل الداخلي للوحة التحكم"
      className={`w-full lg:hidden ${className}`}
    />
  );
};
