import React from 'react';
import { Check } from 'lucide-react';
import { useProfile } from '@/features/profile/context/profileContext';
import { Portal } from '@/shared/components/Overlays/Portal';

/** Save-success toast; portaled to the viewport so the page transform never hides it. */
export const ProfileToast: React.FC = () => {
  const { showToast } = useProfile();

  if (!showToast) return null;

  return (
    <Portal>
      <div className="profile-toast animate-pop-in" role="status" aria-live="polite">
        <div className="profile-toast-icon">
          <Check size={14} className="text-emerald-400" />
        </div>
        <span className="profile-toast-text">تم حفظ تغييرات الملف الشخصي بنجاح!</span>
      </div>
    </Portal>
  );
};
