import React from 'react';
import { Radio } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { LiveSessionPlayerCard } from '@/features/courses/components/cards/LiveSessionPlayerCard';

/** Live tab: every weekly Google Meet session laid out as launchpad cards. */
export const LiveSessionPanel: React.FC = () => {
  const { course } = useCoursePlayer();
  if (!course) return null;

  return (
    <div className="player-panel">
      <div className="player-panel-head">
        <Radio size={16} className="text-blue-400 shrink-0" />
        <h2 className="player-panel-title">{courseCopy.player.liveTitle}</h2>
      </div>

      <div className="flex flex-col gap-3">
        {course.liveSessions.map((session, idx) => (
          <div key={session.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 70}ms` }}>
            <LiveSessionPlayerCard session={session} />
          </div>
        ))}
      </div>
    </div>
  );
};