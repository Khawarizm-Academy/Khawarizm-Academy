import React from 'react';
import { Trophy } from 'lucide-react';
import { FeaturePlaceholder } from '@/shared/components/Placeholder/FeaturePlaceholder';

export const CompetitionsPage: React.FC = () => {
  return (
    <FeaturePlaceholder
      title="المسابقات والتحديات"
      description="ساحة تحدي الخوارزميات السنوي، ساحة التحدي البرمجية، وجميع المسابقات العلمية — قريبًا هنا."
      icon={<Trophy size={36} />}
    />
  );
};