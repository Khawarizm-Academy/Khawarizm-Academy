import React from 'react';
import { Clock, Trophy } from 'lucide-react';
import type { Competition } from '@/shared/types/entities';

interface CompetitionCardProps {
  competition: Competition;
  onAction: () => void;
}

/** One competition card: badge, title, description, remaining time and CTA. */
export const CompetitionCard: React.FC<CompetitionCardProps> = ({ competition, onAction }) => (
  <article className="card-interactive-gold competition-card group">
    <span className="card-top-bar-gold" />

    <div className="competition-card-body">
      <div className="flex items-center justify-between">
        <span className="badge-gold">{competition.badge}</span>
        <div className="card-icon-box text-gold-400">
          <Trophy size={20} />
        </div>
      </div>

      <h3 className="card-title-lg">{competition.title}</h3>
      <p className="competition-card-desc">{competition.description}</p>

      <div className="competition-timer">
        <Clock size={15} className="text-gold-400" />
        <span className="competition-timer-value">{competition.daysRemaining} يوم</span>
        <span className="competition-timer-sep">•</span>
        <span className="competition-timer-value">{competition.hoursRemaining} ساعة</span>
        <span className="competition-timer-label">متبقية</span>
      </div>

      <button type="button" onClick={onAction} className="btn-gold w-full text-sm">
        {competition.actionText}
      </button>
    </div>
  </article>
);
