import React, { useEffect } from 'react';
import { useAuth } from '@/features/auth/context/authContext';

/** Global auth notice: session lost, welcome, or an error. Auto-hides. */
export const AuthToast: React.FC = () => {
  const { notice, setNotice } = useAuth();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);

  if (!notice) return null;

  return (
    <div className="auth-toast animate-fade-in">
      <span className="auth-toast-dot" />
      <span>{notice}</span>
    </div>
  );
};
