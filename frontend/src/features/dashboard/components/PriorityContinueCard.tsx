import React from 'react';
import { Brain } from 'lucide-react';
import dashboardViewsJson from '../../../shared/json/dashboardViews.json';

interface PriorityContinueCardProps {
  onContinue?: () => void;
}

const CARD = dashboardViewsJson.priorityCard;

export const PriorityContinueCard: React.FC<PriorityContinueCardProps> = ({ onContinue }) => {
  return (
    <div dir="rtl" className="dash-hero dash-hero-cyan group animate-pop-in">
      {/* Background ambient gradient glow */}
      <div className="dash-hero-glow w-64 h-64 bg-blue-500/5" />

      {/* Hero tag */}
      <div className="dash-hero-tag dash-hero-tag-cyan">
        <span className="dash-hero-tag-label">{CARD.tagLabel}</span>
      </div>

      {/* Main row: thumbnail on right, title/info on left in RTL */}
      <div className="dash-hero-row">
        <div className="dash-hero-thumb dash-hero-thumb-cyan">
          <div className="dash-hero-figure">
            <Brain
              size={36}
              strokeWidth={1.8}
              className="text-blue-400 drop-shadow-[0_0_10px_rgba(41,169,255,0.8)] group-hover:animate-wiggle"
            />
            <span className="dash-hero-dot animate-star-twinkle" />
          </div>
        </div>

        <div className="dash-hero-text">
          <h2 className="dash-hero-title">{CARD.title}</h2>
          <p className="dash-hero-sub">{CARD.track}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="dash-progress">
        <div className="dash-progress-head">
          <span className="dash-progress-label">
            الدرس {CARD.currentLesson} من {CARD.totalLessons} دروس
          </span>
          <span className="dash-progress-value">{CARD.completionPercentage}% مكتمل</span>
        </div>

        <div className="dash-progress-track">
          <div
            style={{ width: `${CARD.completionPercentage}%` }}
            className="dash-progress-fill"
          />
        </div>
      </div>

      {/* Action button */}
      <button type="button" onClick={onContinue} className="btn-gold dash-hero-action">
        استمر في التعلم
      </button>
    </div>
  );
};
