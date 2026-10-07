import React, { useState } from 'react';
import { useNavigate, useSearchParams } from '../../../app/routerContext';
import { DEFAULT_RETURNING_USER } from '../types';
import { NAV_TARGETS } from '../../../shared/lib/navigation';
import type { AuthMode } from '../types';
import { AuthHeroPanel } from '../components/AuthHeroPanel';
import { DefaultLoginCard } from '../components/DefaultLoginCard';
import { WelcomeBackCard } from '../components/WelcomeBackCard';
import { AuthModeSwitch } from '../components/AuthModeSwitch';
import brandIcon from '../../../assets/brand/generated/icon-192.png';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mode can be initialized or controlled via URL ?mode=welcome-back
  const modeFromUrl = searchParams.get('mode') === 'welcome-back' ? 'welcome-back' : 'login';
  const [authMode, setAuthMode] = useState<AuthMode>(modeFromUrl);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleModeChange = (newMode: AuthMode) => {
    setAuthMode(newMode);
    setSearchParams({ mode: newMode });
  };

  const handleSuccessfulAuth = () => {
    setToastMessage('تم تسجيل الدخول بنجاح! مرحبًا بك.');
    setTimeout(() => {
      navigate(NAV_TARGETS.dashboard);
    }, 800);
  };

  // One active card, rendered on both surfaces with their own variant
  const activeCard = (variant: 'desktop' | 'mobile') =>
    authMode === 'login' ? (
      <DefaultLoginCard
        variant={variant}
        onSubmitEmail={handleSuccessfulAuth}
        onSwitchToReturningUser={() => handleModeChange('welcome-back')}
      />
    ) : (
      <WelcomeBackCard
        user={DEFAULT_RETURNING_USER}
        variant={variant}
        onQuickLogin={handleSuccessfulAuth}
        onSwitchToEmail={() => handleModeChange('login')}
      />
    );

  return (
    <div className="auth-shell">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="auth-toast animate-fade-in">
          <span className="auth-toast-dot" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Desktop split screen */}
      <div className="auth-split-screen">
        {/* Hero panel, right in RTL */}
        <div className="w-[640px] xl:w-[704px] h-full">
          <AuthHeroPanel
            mode={authMode}
            user={DEFAULT_RETURNING_USER}
            onLogoClick={() => navigate(NAV_TARGETS.home)}
          />
        </div>

        {/* Dedicated authentication card chamber, end in RTL */}
        <div className="auth-chamber">
          {/* Top Bar: Return to Home & Demo State Switcher */}
          <div className="auth-top-bar">
            <button
              onClick={() => navigate(NAV_TARGETS.home)}
              className="auth-back-link"
              title="العودة للصفحة الرئيسية"
            >
              <span>←</span>
              <span>العودة للرئيسية</span>
            </button>
            <AuthModeSwitch mode={authMode} onChange={handleModeChange} />
          </div>

          {/* Active Card */}
          <div className="auth-card-slot">{activeCard('desktop')}</div>

          {/* Bottom Legal Disclaimer */}
          <div className="auth-legal max-w-sm">
            {authMode === 'login' ? (
              <p className="auth-legal-text">
                <span>بإنشاء حساب، أنت توافق على </span>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="auth-legal-link"
                >
                  شروط الاستخدام
                </button>
                <span> وسياسة </span>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="auth-legal-link"
                >
                  الخصوصية
                </button>
                <span> الخاصة بأكاديمية خوارزم.</span>
              </p>
            ) : (
              <p className="auth-legal-text">
                أكاديمية خوارزم · منصة التعلم الذاتي الرائدة
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile view */}
      <div className="auth-mobile">
        {/* Background radial gold glow */}
        <div className="auth-glow-mobile" aria-hidden="true" />

        {/* Top Bar: Return Link & Demo Switcher */}
        <div className="auth-top-bar max-w-md mb-4">
          <button
            onClick={() => navigate(NAV_TARGETS.home)}
            className="auth-back-link"
          >
            <span>←</span>
            <span>الرئيسية</span>
          </button>
          <AuthModeSwitch mode={authMode} onChange={handleModeChange} />
        </div>

        {/* Centered Mobile Brand Seal & Headline */}
        <div className="auth-mobile-brand">
          <div onClick={() => navigate(NAV_TARGETS.home)} className="brand-seal">
            <div className="brand-seal-inner">
              <img src={brandIcon} alt="أكاديمية خوارزم" />
            </div>
          </div>

          <div className="auth-mobile-heading">
            <h1 className="auth-mobile-title">أكاديمية خوارزم</h1>
            <p className="auth-mobile-subtitle">
              تعلّم مهارة، أو اعثر على منحتك القادمة
            </p>
          </div>
        </div>

        {/* Mobile Auth Body */}
        <div className="auth-body">
          {activeCard('mobile')}

          {/* Mobile Footer Disclaimer */}
          <div className="auth-legal px-2">
            {authMode === 'login' ? (
              <p className="auth-legal-text">
                بالمتابعة، أنت توافق على{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="auth-legal-link"
                >
                  شروط الاستخدام والسياسات
                </button>{' '}
                الخاصة بخدمة الأكاديمية الرقمية.
              </p>
            ) : (
              <p className="auth-legal-text">
                أكاديمية خوارزم · منصة التعلم الذاتي الرائدة
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Terms and privacy modal */}
      {showTermsModal && (
        <div className="auth-terms-scrim animate-fade-in">
          <div className="auth-terms-panel">
            <h3 className="auth-terms-title">شروط الاستخدام وسياسة الخصوصية</h3>
            <div className="auth-terms-body">
              <p>
                أهلاً بك في أكاديمية خوارزم. نلتزم بأعلى معايير حماية البيانات والتشفير المعتمد (SSL/TLS) لضمان سرية حسابك وتقدمك الأكاديمي.
              </p>
              <p>
                1. يتم استخدام بريدك الإلكتروني والبيانات الشخصية حصراً لإدارة حسابك ومتابعة دوراتك والفرص الدراسية المحفوظة.
              </p>
              <p>
                2. لا نشارك بيانات الطلاب مع أي طرف خارجي تجاري.
              </p>
              <p>
                3. يمكنك تعديل بياناتك أو حذف حسابك في أي وقت عبر إعدادات الملف الشخصي.
              </p>
            </div>
            <div className="auth-terms-actions">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="btn-gold text-sm"
              >
                موافق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
