import React from 'react';
import { Check } from 'lucide-react';
import { useProfile } from '@/features/profile/context/profileContext';

/** Save-success toast; renders nothing while hidden. */
export const ProfileToast: React.FC = () => {
  const { showToast } = useProfile();

  if (!showToast) return null;

  return (
    <div className="profile-toast animate-pop-in">
      <div className="profile-toast-icon">
        <Check size={14} className="text-emerald-400" />
      </div>
      <span className="profile-toast-text">تم حفظ تغييرات الملف الشخصي بنجاح!</span>
    </div>
  );
};