import React from 'react';
import { SearchX } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import { StatePanel } from '@/shared/components/State/StatePanel';

/** Shared "course not found" state for the landing, player and certificate pages. */
export const CourseNotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <StatePanel
      title="الدورة غير متوفرة"
      text="لم يتم العثور على هذه الدورة. قد تكون منتهية أو لم تُنشر بعد."
      icon={<SearchX size={32} />}
      action={
        <button type="button" onClick={() => navigate(NAV_TARGETS.courses)} className="btn-gold text-xs mt-2">
          استعراض الدورات
        </button>
      }
    />
  );
};