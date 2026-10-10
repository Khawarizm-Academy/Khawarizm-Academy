import React from 'react';
import { Trophy } from 'lucide-react';
import type { Competition } from '../../types/entities';
import { useCountdown } from '../../hooks/useCountdown';
import { CountdownDigits } from './CountdownDigits';

interface CompetitionBannerProps {
  competition: Competition;
  variant?: 'desktop' | 'mobile';
  onRegister?: () => void;
}

export const CompetitionBanner: React.FC<CompetitionBannerProps> = ({
  competition,
  variant = 'desktop',
  onRegister,
}) => {
  // Live real-time countdown shared with the dashboard challenge spotlight
  const timeLeft = useCountdown({
    days: parseInt(competition.daysRemaining, 10) || 3,
    hours: parseInt(competition.hoursRemaining, 10) || 14,
    minutes: 36,
    seconds: 48,
  });

  // Mobile Variant matching media_1788955065979.png with timer directly unified with registration button
  if (variant === 'mobile') {
    return (
      <section className="banner-mobile-card">
        {/* Subtle decorative background shimmer */}
        <div className="comp-glow" />

        {/* Top Badge (مسابقة برمجية) */}
        <div className="comp-band">
          <span className="comp-band-dot" />
          <span>{competition.badge}</span>
        </div>

        {/* Title */}
        <h3 className="comp-title-mobile">{competition.title}</h3>

        {/* Action & Timer Unit — Placed right above & tightly coupled with registration button */}
        <div className="comp-unit">
          {/* Live Countdown Digits — Thick, Solid 3D Digit Boxes matching Figma */}
          <CountdownDigits value={timeLeft} variant="mobile" />

          {/* Primary CTA Button (سجل الآن) */}
          <button onClick={onRegister} className="btn-gold w-full py-3.5 text-base rounded-xl">
            {competition.actionText}
          </button>
        </div>
      </section>
    );
  }

  // Desktop Variant: Timer placed right next to the "سجل الآن" button
  return (
    <section className="banner-frame-gold">
      {/* Decorative animated shimmer beam sweeping across */}
      <div className="comp-shimmer">
        <div className="comp-shimmer-beam animate-shimmer" />
      </div>

      <div className="banner-inner-glass">
        {/* Right (Start in RTL): Trophy Badge + Title & Description */}
        <div className="comp-intro">
          {/* Trophy Golden Icon Badge */}
          <div className="comp-trophy">
            <Trophy size={24} />
          </div>

          <div>
            <h3 className="comp-title">{competition.title}</h3>
            <p className="comp-desc">{competition.description}</p>
          </div>
        </div>

        {/* Left (End in RTL): Integrated Action Cluster — Timer Placed Directly Beside the "سجل الآن" Button */}
        <div className="comp-actions">
          {/* Live Countdown Timer Unit — Thick Substantial Digit Cards */}
          <CountdownDigits value={timeLeft} variant="desktop" />

          {/* Button "سجل الآن" */}
          <button
            onClick={onRegister}
            className="btn-gold px-7 py-3 text-sm sm:text-base shrink-0 whitespace-nowrap"
          >
            {competition.actionText}
          </button>
        </div>
      </div>
    </section>
  );
};
