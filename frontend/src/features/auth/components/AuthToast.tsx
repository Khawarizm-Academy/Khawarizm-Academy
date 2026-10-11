import React from 'react';
import { useAuthLogin } from '../context/authLoginContext';

/** Auth success toast, shown once after a login completes. */
export const AuthToast: React.FC = () => {
  const { toastMessage } = useAuthLogin();

  if (!toastMessage) return null;

  return (
    <div className="auth-toast animate-fade-in">
      <span className="auth-toast-dot" />
      <span>{toastMessage}</span>
    </div>
  );
};