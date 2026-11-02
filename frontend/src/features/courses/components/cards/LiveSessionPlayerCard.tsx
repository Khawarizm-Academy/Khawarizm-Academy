import React, { useMemo } from 'react';
import { CalendarCheck, CalendarDays, Clock, ExternalLink, PlayCircle, Radio } from 'lucide-react';
import { LiveSessionCountdown } from '@/shared/components/LiveSessionCountdown';
import { courseCopy } from '@/features/courses/data/courseCopy';
import type { CourseLiveSession, LiveSessionState } from '@/shared/types/entities';

interface LiveSessionPlayerCardProps {
  session: CourseLiveSession;
}

const CARD_CLASS: Record<LiveSessionState, string> = {
  live: 'player-live-card player-live-card-live',
  upcoming: 'player-live-card player-live-card-upcoming',
  past: 'player-live-card player-live-card-past',
};

const STATE_CHIP: Record<LiveSessionState, string> = {
  live: 'flex items-center gap-2 text-danger-500 text-xs font-display font-bold',
  upcoming: 'flex items-center gap-2 text-blue-400 text-xs font-display font-bold',
  past: 'flex items-center gap-2 text-slate-500 text-xs font-display font-bold',
};

const STATE_LABEL: Record<LiveSessionState, string> = {
  live: courseCopy.player.liveNow,
  upcoming: courseCopy.player.liveUpcoming,
  past: courseCopy.player.livePast,
};

function calendarDate(value: string): string {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function googleCalendarUrl(session: CourseLiveSession): string | null {
  if (!session.startsAt) return null;
  const start = new Date(session.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + Math.max(1, session.durationMinutes || 60) * 60_000);
  const details = [session.notes, session.meetUrl].filter(Boolean).join('\n\n');
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: session.title,
    dates: `${calendarDate(start.toISOString())}/${calendarDate(end.toISOString())}`,
    details,
    location: session.meetUrl || '',
    ...(session.timezone ? { ctz: session.timezone } : {}),
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

/** One session card; join and replay links are server-validated before they reach this component. */
export const LiveSessionPlayerCard: React.FC<LiveSessionPlayerCardProps> = ({ session }) => {
  const state = CARD_CLASS[session.state] ? session.state : 'past';
  const calendarUrl = useMemo(() => googleCalendarUrl(session), [session]);

  return (
    <div className={CARD_CLASS[state]}>
      <div className="player-live-head">
        <div className="flex items-center gap-2.5 min-w-0">
          <Radio size={15} className="text-blue-400 shrink-0" />
          <h3 className="player-live-title truncate">{session.title}</h3>
        </div>
        <span className={STATE_CHIP[state]}>
          {state === 'live' && <span className="w-2 h-2 rounded-full bg-danger-500 animate-ping" />}
          {STATE_LABEL[state]}
        </span>
      </div>

      <div className="player-live-meta">
        <span className="flex items-center gap-1.5"><CalendarDays size={13} />{session.dateLabel}</span>
        <span className="flex items-center gap-1.5"><Clock size={13} />{session.timeLabel}</span>
      </div>

      {state === 'upcoming' && session.startsAt && (
        <LiveSessionCountdown startsAt={session.startsAt} serverNow={session.serverNow} className="player-live-countdown" />
      )}
      {session.notes?.trim() && <p className="player-live-notes">{session.notes}</p>}

      {state === 'live' && (session.meetUrl ? (
        <a className="btn-gold player-join" href={session.meetUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={15} />{courseCopy.player.joinNow}
        </a>
      ) : (
        <button type="button" className="player-join-disabled" disabled>رابط الاجتماع غير متاح</button>
      ))}

      {state === 'upcoming' && (
        <>
          {calendarUrl ? (
            <a className="btn-outline-blue player-join" href={calendarUrl} target="_blank" rel="noopener noreferrer">
              <CalendarCheck size={15} />{courseCopy.player.addToCalendar}
            </a>
          ) : (
            <button type="button" className="player-join-disabled" disabled>التاريخ غير محدد</button>
          )}
          <button type="button" disabled className="player-join-disabled">{courseCopy.player.joinSoon}</button>
          <p className="text-[11px] text-slate-400 font-body text-center">{courseCopy.player.joinDisabled}</p>
        </>
      )}

      {state === 'past' && (session.recordingUrl ? (
        <a className="btn-outline-blue player-join" href={session.recordingUrl} target="_blank" rel="noopener noreferrer">
          <PlayCircle size={15} />{courseCopy.player.watchRecording}
        </a>
      ) : (
        <button type="button" disabled className="player-join-disabled">
          <PlayCircle size={15} />{session.recordingAssetId ? 'أرفق المدرّب التسجيل؛ سيظهر هنا بعد إضافته إلى المنهج كدرس إعادة' : 'لا يوجد تسجيل متاح'}
        </button>
      ))}
    </div>
  );
};
