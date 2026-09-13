import React from 'react';
import { FeaturePlaceholder } from '../../../shared/components/Placeholder/FeaturePlaceholder';

export const CompetitionsPage: React.FC = () => {
  return (
    <FeaturePlaceholder
      title="المسابقات والتحديات"
      description="ساحة تحدي الخوارزميات السنوي، ساحة التحدي البرمجية، وجميع المسابقات العلمية — قريبًا هنا."
      icon={
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 21h8M12 17v4M12 3a6 6 0 0 0-3 11.2V16h6v-1.8A6 6 0 0 0 12 3Z" />
        </svg>
      }
    />
  );
};