import React from 'react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { useProfile } from '@/features/profile/context/profileContext';

type SaveActionsPlacement = 'desktop' | 'mobile';

interface ProfileSaveActionsProps {
  placement: SaveActionsPlacement;
}

/** Which surface each save row anchors to; both render inside the form. */
const PLACEMENT_CLASS: Record<SaveActionsPlacement, string> = {
  desktop: 'hidden lg:flex',
  mobile: 'lg:hidden',
};

/**
 * Save / reset row, rendered twice on purpose: on desktop it anchors to the
 * primary column, and on mobile it is the form footer — so the taller summary
 * card never pushes the buttons down.
 */
export const ProfileSaveActions: React.FC<ProfileSaveActionsProps> = ({ placement }) => {
  const { isSaving, resetProfile } = useProfile();

  return (
    <div className={`profile-actions ${PLACEMENT_CLASS[placement]}`}>
      <button
        type="submit"
        disabled={isSaving}
        className="btn-gold btn-attention w-full sm:w-auto px-8 py-3.5 text-sm sm:text-base disabled:opacity-70"
      >
        {isSaving ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>جاري الحفظ...</span>
          </>
        ) : (
          <>
            <Save size={18} />
            <span>حفظ التغييرات</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={resetProfile}
        className="btn-pill-subtle w-full sm:w-auto text-xs sm:text-sm"
      >
        <RotateCcw size={15} />
        <span>استعادة الافتراضي</span>
      </button>
    </div>
  );
};