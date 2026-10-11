import React from 'react';
import { Trophy } from 'lucide-react';
import { CountdownDigits } from '@/shared/components/Banners/CountdownDigits';
import { useCountdown } from '@/shared/hooks/useCountdown';
import dashboardViewsJson from '@/shared/json/dashboardViews.json';

interface ChallengeSpotlightCardProps {
  onEnter?: () => void;
}

const CARD = dashboardViewsJson.challengeCard;

/**
 * Gold priority spotlight: the annual challenge with a live countdown,
 * the dashboard twin of the home competition banner.
 */
export const ChallengeSpotlightCard: React.FC<ChallengeSpotlightCardProps> = ({ onEnter }) => {
  const timeLeft = useCountdown({
    days: CARD.days,
    hours: CARD.hours,
    minutes: CARD.minutes,
    seconds: CARD.seconds,
  });

  return (
    <div dir="rtl" className="dash-hero dash-hero-gold group">
      {/* Warm ambient beacon atmosphere */}
      <div className="dash-hero-glow w-72 h-72 bg-gold-400/10" />

      {/* Challenge tag */}
      <div className="dash-hero-tag dash-hero-tag-gold">
        <span className="size-2 rounded-full bg-gold-400 animate-ping shrink-0" />
        <span className="dash-hero-tag-label-gold">{CARD.badge}</span>
      </div>

      {/* Title + description */}
      <div className="dash-hero-row">
        <div className="dash-hero-thumb dash-hero-thumb-gold">
          <div className="dash-hero-figure">
            <Trophy
              size={36}
              strokeWidth={1.8}
              className="text-gold-400 drop-shadow-[0_0_10px_rgba(229,182,92,0.6)] group-hover:animate-wiggle"
            />
            <span className="dash-hero-dot -top-1 -right-1 animate-star-twinkle" />
          </div>
        </div>

        <div className="dash-hero-text">
          <h3 className="dash-hero-title">{CARD.title}</h3>
          <p className="dash-hero-sub">{CARD.description}</p>
        </div>
      </div>

      {/* Live countdown */}
      <CountdownDigits value={timeLeft} variant="desktop" />

      {/* Key CTA — the one button that begs to be pressed */}
      <div className="dash-hero-action">
        <button
          type="button"
          onClick={onEnter}
          className="btn-gold btn-attention w-full md:w-auto px-6 py-3 text-sm md:text-base"
        >
          <Trophy size={18} />
          <span>{CARD.ctaLabel}</span>
        </button>
      </div>
    </div>
  );
};
