import React from 'react';
import { CalendarDays } from 'lucide-react';
import { FeaturePlaceholder } from '../../../shared/components/Placeholder/FeaturePlaceholder';

export const EventsPage: React.FC = () => {
  return (
    <FeaturePlaceholder
      title="الفعاليات والندوات"
      description="جاهزون لعرض مؤتمر خوارزم السنوي، ورش العمل التقنية، والندوات العلمية المتخصصة — قريبًا على هذه الصفحة."
      icon={<CalendarDays size={36} />}
    />
  );
};