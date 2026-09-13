import React, { useState } from 'react';
import { useNavigate, useSearchParams } from '../../../app/routerContext';
import { DEFAULT_RETURNING_USER } from '../types';
import type { AuthMode } from '../types';
import { AuthHeroPanel } from '../components/AuthHeroPanel';
import { DefaultLoginCard } from '../components/DefaultLoginCard';
import { WelcomeBackCard } from '../components/WelcomeBackCard';
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
    setToastMessage(`تم تسجيل الدخول بنجاح! مرحبًا بك.`);
    setTimeout(() => {
      navigate('/dashboard');
    }, 800);
  };

  return (
    <div className="min-h-screen w-full bg-[#040F24] flex items-center justify-center relative overflow-hidden select-text">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-[#092557] border border-[#29A9FF] text-[#DCE5EE] text-sm font-bold shadow-xl animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3FAE6B] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          1. DESKTOP VIEW (Split Screen 16:10 / >= 1024px)
          Matches desktop-login.png and desktop-welcome-back.png
         ========================================================================= */}
      <div className="hidden lg:flex w-full max-w-[1280px] h-[800px] bg-[#040F24] rounded-2xl border border-[#1B3F80] shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden flex-row-reverse relative z-10 m-6">
        
        {/* RIGHT (Start in RTL): Dynamic Cosmic Hero Branding Panel */}
        <div className="w-[640px] xl:w-[704px] h-full">
          <AuthHeroPanel
            mode={authMode}
            user={DEFAULT_RETURNING_USER}
            onLogoClick={() => navigate('/')}
          />
        </div>

        {/* LEFT (End in RTL): Dedicated Authentication Card Chamber */}
        <div className="flex-1 h-full px-12 xl:px-16 py-10 border-l border-[#1B3F80] flex flex-col justify-between items-center bg-[#040F24]/90 relative">
          
          {/* Top Bar: Return to Home & Demo State Switcher */}
          <div className="w-full flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-xs text-[#8299B5] hover:text-[#E5B65C] transition-colors font-['Tajawal',sans-serif] cursor-pointer"
              title="العودة للصفحة الرئيسية"
            >
              <span>←</span>
              <span>العودة للرئيسية</span>
            </button>

            {/* Quick Demo Mode Switch Pill */}
            <div className="inline-flex items-center p-0.5 rounded-full bg-[#061A3A] border border-[#1B3F80]/60 text-[11px] font-['Tajawal',sans-serif]">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-[#167BDB] text-white font-bold shadow-sm'
                    : 'text-[#8299B5] hover:text-[#DCE5EE]'
                }`}
              >
                دخول جديد
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('welcome-back')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  authMode === 'welcome-back'
                    ? 'bg-[#E5B65C] text-[#040F24] font-bold shadow-sm'
                    : 'text-[#8299B5] hover:text-[#DCE5EE]'
                }`}
              >
                طالب سابق
              </button>
            </div>
          </div>

          {/* Center: Active Card (Default or Welcome Back) */}
          <div className="w-full max-w-[440px] py-4">
            {authMode === 'login' ? (
              <DefaultLoginCard
                variant="desktop"
                onSubmitEmail={handleSuccessfulAuth}
                onSwitchToReturningUser={() => handleModeChange('welcome-back')}
              />
            ) : (
              <WelcomeBackCard
                user={DEFAULT_RETURNING_USER}
                variant="desktop"
                onQuickLogin={handleSuccessfulAuth}
                onSwitchToEmail={() => handleModeChange('login')}
              />
            )}
          </div>

          {/* Bottom Legal Disclaimer */}
          <div className="w-full max-w-sm text-center">
            {authMode === 'login' ? (
              <p className="text-xs text-[#8299B5] font-['Tajawal',sans-serif] leading-5">
                <span>بإنشاء حساب، أنت توافق على </span>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#E5B65C] underline hover:text-white cursor-pointer"
                >
                  شروط الاستخدام
                </button>
                <span> وسياسة </span>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#E5B65C] underline hover:text-white cursor-pointer"
                >
                  الخصوصية
                </button>
                <span> الخاصة بأكاديمية خوارزم.</span>
              </p>
            ) : (
              <p className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
                أكاديمية خوارزم · منصة التعلم الذاتي الرائدة
              </p>
            )}
          </div>

        </div>

      </div>

      {/* =========================================================================
          2. MOBILE VIEW (< 1024px)
          Matches mobile-login.png and creates mobile-welcome-back
         ========================================================================= */}
      <div className="flex lg:hidden min-h-screen w-full flex-col justify-between items-center px-4 py-8 relative z-10">
        
        {/* Background Radial Glow */}
        <div
          className="absolute -left-20 top-0 w-80 h-80 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(229,182,92,0.35) 0%, rgba(229,182,92,0) 70%)',
          }}
          aria-hidden="true"
        />

        {/* Top Bar: Return Link & Demo Switcher */}
        <div className="w-full max-w-md flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-[#8299B5] hover:text-[#E5B65C] transition-colors font-['Tajawal',sans-serif] cursor-pointer"
          >
            <span>←</span>
            <span>الرئيسية</span>
          </button>

          <div className="inline-flex items-center p-0.5 rounded-full bg-[#061A3A] border border-[#1B3F80]/60 text-[11px] font-['Tajawal',sans-serif]">
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-[#167BDB] text-white font-bold'
                  : 'text-[#8299B5]'
              }`}
            >
              جديد
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('welcome-back')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                authMode === 'welcome-back'
                  ? 'bg-[#E5B65C] text-[#040F24] font-bold'
                  : 'text-[#8299B5]'
              }`}
            >
              طالب سابق
            </button>
          </div>
        </div>

        {/* Centered Mobile Brand Seal & Headline */}
        <div className="w-full max-w-md flex flex-col items-center gap-3 mb-6 select-none">
          <div
            onClick={() => navigate('/')}
            className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-[#E5B65C] via-[#092557] to-[#C88A32] shadow-[0_0_14px_rgba(229,182,92,0.4)] flex items-center justify-center cursor-pointer"
          >
            <div className="w-full h-full rounded-full bg-[#061A3A] overflow-hidden flex items-center justify-center border border-[#E5B65C]/50">
              <img
                src={brandIcon}
                alt="أكاديمية خوارزم"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-0.5">
            <h1 className="text-xl font-bold text-[#E5B65C] font-['Cairo',sans-serif]">
              أكاديمية خوارزم
            </h1>
            <p className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
              تعلّم مهارة، أو اعثر على منحتك القادمة
            </p>
          </div>
        </div>

        {/* Mobile Auth Body Container */}
        <div className="w-full max-w-md flex flex-col gap-6">
          {authMode === 'login' ? (
            <DefaultLoginCard
              variant="mobile"
              onSubmitEmail={handleSuccessfulAuth}
              onSwitchToReturningUser={() => handleModeChange('welcome-back')}
            />
          ) : (
            <WelcomeBackCard
              user={DEFAULT_RETURNING_USER}
              variant="mobile"
              onQuickLogin={handleSuccessfulAuth}
              onSwitchToEmail={() => handleModeChange('login')}
            />
          )}

          {/* Mobile Footer Disclaimer */}
          <div className="text-center px-2">
            {authMode === 'login' ? (
              <p className="text-xs text-[#8299B5] font-['Tajawal',sans-serif] leading-5">
                بالمتابعة، أنت توافق على{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#E5B65C] underline"
                >
                  شروط الاستخدام والسياسات
                </button>{' '}
                الخاصة بخدمة الأكاديمية الرقمية.
              </p>
            ) : (
              <p className="text-xs text-[#8299B5] font-['Tajawal',sans-serif]">
                أكاديمية خوارزم · منصة التعلم الذاتي الرائدة
              </p>
            )}
          </div>
        </div>

      </div>

      {/* =========================================================================
          3. MODAL: Terms of Service & Privacy
         ========================================================================= */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040F24]/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#061A3A] border border-[#1B3F80] rounded-2xl p-6 sm:p-8 flex flex-col gap-4 text-right shadow-2xl">
            <h3 className="text-xl font-bold text-[#E5B65C] font-['Cairo',sans-serif]">
              شروط الاستخدام وسياسة الخصوصية
            </h3>
            <div className="text-sm text-[#8299B5] font-['Tajawal',sans-serif] leading-relaxed space-y-3 max-h-64 overflow-y-auto pl-2">
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
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="btn-gold py-2 px-6 text-sm font-bold"
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
