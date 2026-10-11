import React from 'react';
import { useAuthLogin } from '@/features/auth/context/authLoginContext';

/** Terms & privacy text modal, opened from either surface's legal notice. */
export const AuthTermsModal: React.FC = () => {
  const { showTermsModal, closeTerms } = useAuthLogin();

  if (!showTermsModal) return null;

  return (
    <div className="auth-terms-scrim animate-fade-in">
      <div className="auth-terms-panel animate-pop-in">
        <h3 className="auth-terms-title">شروط الاستخدام وسياسة الخصوصية</h3>
        <div className="auth-terms-body">
          <p>
            أهلاً بك في أكاديمية خوارزم. نلتزم بأعلى معايير حماية البيانات والتشفير المعتمد (SSL/TLS) لضمان سرية حسابك وتقدمك الأكاديمي.
          </p>
          <p>1. يتم استخدام بريدك الإلكتروني والبيانات الشخصية حصراً لإدارة حسابك ومتابعة دوراتك والفرص الدراسية المحفوظة.</p>
          <p>2. لا نشارك بيانات الطلاب مع أي طرف خارجي تجاري.</p>
          <p>3. يمكنك تعديل بياناتك أو حذف حسابك في أي وقت عبر إعدادات الملف الشخصي.</p>
        </div>
        <div className="auth-terms-actions">
          <button type="button" onClick={closeTerms} className="btn-gold text-sm">
            موافق
          </button>
        </div>
      </div>
    </div>
  );
};