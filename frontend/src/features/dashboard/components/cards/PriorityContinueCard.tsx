import React from 'react';
import { Brain } from 'lucide-react';
import { useDashboardContent } from '@/features/dashboard/context/DashboardContentContext';

interface PriorityContinueCardProps {
  onContinue?: () => void;
}

export const PriorityContinueCard: React.FC<PriorityContinueCardProps> = ({ onContinue }) => {
  const { content } = useDashboardContent();
  const card = content.views.priorityCard;
  return (
    <div dir="rtl" className="dash-hero dash-hero-cyan group animate-pop-in">
      {/* Background ambient gradient glow */}
      <div className="dash-hero-glow w-64 h-64 bg-blue-500/5" />

      {/* Hero tag */}
      <div className="dash-hero-tag dash-hero-tag-cyan">
        <span className="dash-hero-tag-label">{card.tagLabel}</span>
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
          <h2 className="dash-hero-title">{card.title}</h2>
          <p className="dash-hero-sub">{card.track}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="dash-progress">
        <div className="dash-progress-head">
          <span className="dash-progress-label">
            الدرس {card.currentLesson} من {card.totalLessons} دروس
          </span>
          <span className="dash-progress-value">{card.completionPercentage}% مكتمل</span>
        </div>

        <div className="dash-progress-track">
          <div
            style={{ width: `${card.completionPercentage}%` }}
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
