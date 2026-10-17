import React from 'react';
import { DEVICE_LABELS, type DeviceBreakdown, type DeviceCount } from '@/features/admin/types';
import { formatCount } from '@/features/admin/data/adminFormatters';

/** Device types are a closed set the API labels; OS/browser values stay as-is. */
const deviceTypeLabel = (key: string): string => DEVICE_LABELS[key] ?? key;

interface BreakdownListProps {
  title: string;
  entries: DeviceCount[];
  labelFor?: (key: string) => string;
}

const BreakdownList: React.FC<BreakdownListProps> = ({ title, entries, labelFor = (key) => key }) => {
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="admin-breakdown">
      <h3 className="admin-breakdown-title">{title}</h3>
      {entries.length === 0 && <p className="admin-breakdown-empty">لا توجد بيانات بعد.</p>}
      {entries.map((entry) => {
        const share = total === 0 ? 0 : Math.round((entry.count / total) * 100);
        return (
          <div key={entry.key} className="admin-breakdown-row">
            <span className="admin-breakdown-meta">
              <span className="admin-breakdown-label">{labelFor(entry.key)}</span>
              <span className="admin-breakdown-count">
                {formatCount(entry.count)} · {formatCount(share)}٪
              </span>
            </span>
            <span className="admin-breakdown-track">
              <span className="admin-breakdown-fill" style={{ width: `${share}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
};

interface DeviceBreakdownListsProps {
  breakdown: DeviceBreakdown;
}

/** OS, browser, and device-type shares of the whole session fleet. */
export const DeviceBreakdownLists: React.FC<DeviceBreakdownListsProps> = ({ breakdown }) => (
  <div className="admin-breakdown-grid">
    <BreakdownList title="أنظمة التشغيل" entries={breakdown.os} />
    <BreakdownList title="المتصفحات" entries={breakdown.browser} />
    <BreakdownList title="نوع الجهاز" entries={breakdown.deviceType} labelFor={deviceTypeLabel} />
  </div>
);
