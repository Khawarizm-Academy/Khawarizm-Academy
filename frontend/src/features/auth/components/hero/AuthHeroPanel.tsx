import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AuthMode, ReturningUserData } from '@/features/auth/types';
import { BrandSeal } from '@/features/auth/components/hero/BrandSeal';

interface AuthHeroPanelProps {
  mode: AuthMode;
  user?: ReturningUserData;
  onLogoClick?: () => void;
}

export const AuthHeroPanel: React.FC<AuthHeroPanelProps> = ({
  mode,
  user,
  onLogoClick,
}) => {
  const isWelcomeBack = mode === 'welcome-back';

  return (
    <div className="auth-hero">
      {/* Atmospheric celestial glows */}
      <div className="auth-glow-gold" aria-hidden="true" />
      <div className="auth-glow-cyan" aria-hidden="true" />

      {/* Brand seal & academy name */}
      <div
        onClick={onLogoClick}
        className="auth-brand group"
        title="العودة للصفحة الرئيسية"
      >
        <div className="flex flex-col items-end text-right">
          <span className="auth-brand-name">أكاديمية خوارزم</span>
          <span className="auth-brand-tag">KHAWARIZM ACADEMY</span>
        </div>

        <BrandSeal />
      </div>

      {/* Dynamic astrolabe orbit artwork */}
      <div className="auth-orbit-stage">
        <div className="auth-orbit-canvas">
          <div className="auth-orbit-ring-outer animate-orbit-slow" />
          <div className="auth-orbit-ring-inner" />
          <div className="auth-orbit-line rotate-[30deg]" />
          <div className="auth-orbit-line rotate-[120deg]" />
          <div className="auth-orbit-core">
            <div className="auth-orbit-core-glow" />
            <div className="auth-orbit-core-star" />
          </div>
        </div>
      </div>

      {/* Bottom taglines and stats */}
      <div className="auth-hero-foot">
        {!isWelcomeBack ? (
          <>
            <div className="auth-hero-group">
              <h1 className="auth-hero-title text-3xl lg:text-4xl">
                تعلّم مهارة غدٍ، أو اعثر على منحتك القادمة
              </h1>
              <p className="auth-hero-text text-sm lg:text-base">
                بوابتك الذكية لفرص التعليم العالمي والتمكين التقني في العالم العربي. صممت خوارزم لترافق خطوات تميزك الأكاديمي.
              </p>
            </div>

            {/* Trust Shield Badge */}
            <div className="auth-trust">
              <span className="auth-trust-text">
                نظام تشفير معتمد وحماية بيانات كاملة
              </span>
              <ShieldCheck size={16} className="text-sky-400" />
            </div>
          </>
        ) : (
          <>
            <div className="auth-hero-group">
              <h1 className="auth-hero-title text-4xl lg:text-5xl">
                أهلاً بعودتك من جديد!
              </h1>
              <p className="auth-hero-text text-base lg:text-lg">
                مستعد لمتابعة رحلة التعلم؟ مجموعتك المفضلة من الكورسات والمنح تنتظرك لتأخذ خطوتك التالية اليوم.
              </p>
            </div>

            {/* Returning user quick stats */}
            <div className="auth-hero-stats">
              <div className="auth-stat items-end">
                <span className="auth-stat-value text-xl text-gold-400">
                  {user?.activeCoursesCount ?? 3} دورات مستمرة
                </span>
                <span className="auth-stat-label text-xs">قيد التقدم</span>
              </div>

              <div className="auth-stat-divider h-7" aria-hidden="true" />

              <div className="auth-stat items-end">
                <span className="auth-stat-value text-xl text-blue-400">
                  {user?.savedScholarshipsCount ?? 5} منح محفوظة
                </span>
                <span className="auth-stat-label text-xs">متاحة للتسجيل</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
