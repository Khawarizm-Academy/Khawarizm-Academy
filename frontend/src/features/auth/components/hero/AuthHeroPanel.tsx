import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { BrandSeal } from '@/features/auth/components/hero/BrandSeal';

interface AuthHeroPanelProps {
  onLogoClick?: () => void;
}

/** Desktop hero: brand, orbit artwork, and the academy promise. */
export const AuthHeroPanel: React.FC<AuthHeroPanelProps> = ({ onLogoClick }) => (
  <div className="auth-hero">
    {/* Atmospheric celestial glows */}
    <div className="auth-glow-gold" aria-hidden="true" />
    <div className="auth-glow-cyan" aria-hidden="true" />

    {/* Brand seal & academy name */}
    <div onClick={onLogoClick} className="auth-brand group" title="العودة للصفحة الرئيسية">
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

    {/* Bottom taglines and trust badge */}
    <div className="auth-hero-foot">
      <div className="auth-hero-group">
        <h1 className="auth-hero-title text-3xl lg:text-4xl">
          تعلّم مهارة غدٍ، أو اعثر على منحتك القادمة
        </h1>
        <p className="auth-hero-text text-sm lg:text-base">
          بوابتك الذكية لفرص التعليم العالمي والتمكين التقني في العالم العربي. صممت خوارزم لترافق خطوات تميزك الأكاديمي.
        </p>
      </div>

      <div className="auth-trust">
        <span className="auth-trust-text">نظام تشفير معتمد وحماية بيانات كاملة</span>
        <ShieldCheck size={16} className="text-sky-400" />
      </div>
    </div>
  </div>
);
