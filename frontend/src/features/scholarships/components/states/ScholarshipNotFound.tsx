import React from 'react';
import { SearchX } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { CATALOG_SCHOLARSHIPS_ROUTE } from '@/shared/lib/navigation';
import { StatePanel } from '@/shared/components/State/StatePanel';

/** Shared "scholarship not found" state for the detail page. */
export const ScholarshipNotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <StatePanel
      title="المنحة غير متوفرة"
      text="لم يتم العثور على هذه المنحة. قد يكون التقديم قد أغلق أو لم تُنشر بعد."
      icon={<SearchX size={32} />}
      action={
        <button
          type="button"
          onClick={() => navigate(CATALOG_SCHOLARSHIPS_ROUTE)}
          className="btn-gold text-xs mt-2"
        >
          استعراض المنح
        </button>
      }
    />
  );
};
