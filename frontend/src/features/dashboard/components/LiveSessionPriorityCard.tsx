import React from 'react';
import { Radio } from 'lucide-react';
import { useLiveCountdown } from '../hooks/useLiveCountdown';
import dashboardViewsJson from '../../../shared/json/dashboardViews.json';

interface LiveSessionPriorityCardProps {
  onJoinSession?: () => void;
}

const CARD = dashboardViewsJson.liveCard;

export const LiveSessionPriorityCard: React.FC<LiveSessionPriorityCardProps> = ({
  onJoinSession,
}) => {
  const totalSeconds = CARD.initialMinutes * 60 + CARD.initialSeconds;
  const { formattedTime } = useLiveCountdown(totalSeconds);

  return (
    <div dir="rtl" className="dash-hero dash-hero-red">
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
              className="text-red-400 drop-shadow-[0_0_8px_rgba(255,77,77,0.8)]"
            />
            <span className="dash-hero-dot" />
          </div>
        </div>

        <div className="dash-hero-text">
          <h2 className="dash-hero-title">{CARD.courseTitle}</h2>
          <p className="dash-hero-sub md:text-base md:leading-6">
            المعلم: {CARD.instructorName} • {CARD.sessionDescription}
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
