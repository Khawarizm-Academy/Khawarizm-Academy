import React from 'react';
import { Radio } from 'lucide-react';
import { useLiveCountdown } from '@/features/dashboard/hooks/useLiveCountdown';
import { useDashboardContent } from '@/features/dashboard/context/DashboardContentContext';

interface LiveSessionPriorityCardProps {
  onJoinSession?: () => void;
}

export const LiveSessionPriorityCard: React.FC<LiveSessionPriorityCardProps> = ({
  onJoinSession,
}) => {
  const { content } = useDashboardContent();
  const card = content.views.liveCard;
  const totalSeconds = card.initialMinutes * 60 + card.initialSeconds;
  const { formattedTime } = useLiveCountdown(totalSeconds);

  return (
    <div dir="rtl" className="dash-hero dash-hero-red group animate-pop-in">
      {/* Red ambient beacon atmosphere */}
      <div className="dash-hero-glow w-72 h-72 bg-red-500/10" />

      {/* Live tag */}
      <div className="dash-hero-tag dash-hero-tag-red">
        <span className="size-2 rounded-full bg-red-500 animate-ping shrink-0" />
        <span className="dash-hero-tag-label-live">جلستك المباشرة تبدأ قريبًا</span>
      </div>

      {/* Details row: thumbnail on right, text details on left in RTL */}
      <div className="dash-hero-row">
        <div className="dash-hero-thumb dash-hero-thumb-red">
          <div className="dash-hero-figure">
            <Radio
              size={36}
              strokeWidth={1.8}
              className="text-red-400 drop-shadow-[0_0_8px_rgba(255,77,77,0.8)] group-hover:animate-wiggle"
            />
            <span className="dash-hero-dot animate-star-twinkle" />
          </div>
        </div>

        <div className="dash-hero-text">
          <h2 className="dash-hero-title">{card.courseTitle}</h2>
          <p className="dash-hero-sub md:text-base md:leading-6">
            المعلم: {card.instructorName} • {card.sessionDescription}
          </p>
        </div>
      </div>

      {/* Countdown chamber */}
      <div className="dash-countdown">
        <span className="dash-countdown-label">الوقت المتبقي لبدء الجلسة</span>
        <div className="dash-countdown-time">{formattedTime}</div>
      </div>

      {/* Action button */}
      <button type="button" onClick={onJoinSession} className="btn-gold dash-hero-action">
        <span className="hidden md:inline">انضم الآن للجلسة</span>
        <span className="md:hidden">انضم الآن</span>
      </button>
    </div>
  );
};
