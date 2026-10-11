import React from 'react';
import { CalendarCheck, CalendarDays, Clock, ExternalLink, PlayCircle, Radio } from 'lucide-react';
import { courseCopy } from '@/features/courses/data/courseCopy';
import type { CourseLiveSession, LiveSessionState } from '@/shared/types/entities';

interface LiveSessionPlayerCardProps {
  session: CourseLiveSession;
}

/** Card shell tone per weekly-session phase. */
const CARD_CLASS: Record<LiveSessionState, string> = {
  live: 'player-live-card player-live-card-live',
  upcoming: 'player-live-card player-live-card-upcoming',
  past: 'player-live-card player-live-card-past',
};

/** State chip label: pulses only while the session is actually live. */
const STATE_CHIP: Record<LiveSessionState, string> = {
  live: 'flex items-center gap-2 text-danger-500 text-xs font-display font-bold',
  upcoming: 'flex items-center gap-2 text-blue-400 text-xs font-display font-bold',
  past: 'flex items-center gap-2 text-slate-500 text-xs font-display font-bold',
};

/** Which launchpad message a session phase deserves. */
const STATE_LABEL: Record<LiveSessionState, string> = {
  live: courseCopy.player.liveNow,
  upcoming: courseCopy.player.liveUpcoming,
  past: courseCopy.player.livePast,
};

/** One weekly live session card — a Google Meet launchpad, never an embedded call. */
export const LiveSessionPlayerCard: React.FC<LiveSessionPlayerCardProps> = ({ session }) => (
  <div className={CARD_CLASS[session.state]}>
    <div className="player-live-head">
      <div className="flex items-center gap-2.5 min-w-0">
        <Radio size={15} className="text-blue-400 shrink-0" />
        <h3 className="player-live-title truncate">{session.title}</h3>
      </div>

      <span className={STATE_CHIP[session.state]}>
        {session.state === 'live' && <span className="w-2 h-2 rounded-full bg-danger-500 animate-ping" />}
        {STATE_LABEL[session.state]}
      </span>
    </div>

    <div className="player-live-meta">
      <span className="flex items-center gap-1.5">
        <CalendarDays size={13} />
        {session.dateLabel}
      </span>
      <span className="flex items-center gap-1.5">
        <Clock size={13} />
        {session.timeLabel}
      </span>
    </div>

    {session.state === 'live' && (
      <button type="button" className="btn-gold player-join">
        <ExternalLink size={15} />
        {courseCopy.player.joinNow}
      </button>
    )}

    {session.state === 'upcoming' && (
      <>
        <button type="button" className="btn-outline-blue player-join">
          <CalendarCheck size={15} />
          {courseCopy.player.addToCalendar}
        </button>
        <button type="button" disabled className="player-join-disabled">
          {courseCopy.player.joinSoon}
        </button>
        <p className="text-[11px] text-slate-400 font-body text-center">{courseCopy.player.joinDisabled}</p>
      </>
    )}

    {session.state === 'past' && (
      <button type="button" className="btn-outline-blue player-join">
        <PlayCircle size={15} />
        {courseCopy.player.watchRecording}
      </button>
    )}
  </div>
);