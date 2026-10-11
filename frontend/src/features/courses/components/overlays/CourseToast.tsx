import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface CourseToastProps {
  message: string | null;
  onClose: () => void;
}

/** Shared floating confirmation toast for enrollment and lesson completion. */
export const CourseToast: React.FC<CourseToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="course-toast animate-fade-in" role="status">
      <CheckCircle2 size={18} className="text-success-500 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="إغلاق التنبيه"
        className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
      >
        <X size={16} />
      </button>
    </div>
  );
};