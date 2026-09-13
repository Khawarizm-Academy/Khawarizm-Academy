import React from 'react';
import { FeaturePlaceholder } from '../../../shared/components/Placeholder/FeaturePlaceholder';

export const DashboardPage: React.FC = () => {
  return (
    <FeaturePlaceholder
      title="لوحة التحكم الأكاديمية"
      description="ملخص تقدمك، الدورات المستمرة، الإنجازات، وتنبيهات المنح الهامة — ستتاح قريبًا في لوحة واحدة أنيقة."
      icon={
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      }
    />
  );
};