import React from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { useVideoPlayerState, videoPlayerActions } from '@/features/courses/context/videoPlayerStore';
import { formatClock } from '@/features/courses/data/playerTime';

/** Persistent mobile mini-player shown when the video stage is not the focus. */
export const PlayerMiniPlayer: React.FC = () => {
  const { activeLesson, selectTab } = useCoursePlayer();
  const video = useVideoPlayerState();
  if (!activeLesson) return null;

  const isPlaying = video.playState === 'playing' || video.playState === 'buffering';
  const progress = video.durationMs > 0 ? Math.min((video.currentMs / video.durationMs) * 100, 100) : 0;

  return (
    <div className="player-mini lg:hidden animate-fade-in-up">
      <button
        type="button"
        className="player-mini-play"
        aria-label={isPlaying ? courseCopy.player.pauseLabel : courseCopy.player.playLabel}
        onClick={videoPlayerActions.togglePlay}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-white translate-x-[-1px]" />}
      </button>

      <div className="player-mini-info">
        <span className="player-mini-eyebrow">
          {courseCopy.player.tabLabel}
          <span className="player-mini-time" dir="ltr">
            {formatClock(video.currentMs)}
          </span>
        </span>
        <span className="player-mini-title" key={video.sourceKey}>
          {activeLesson.title}
        </span>
        <div className="player-mini-track">
          <div className="player-mini-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <button type="button" onClick={() => selectTab('lesson')} className="btn-outline-blue px-3.5 py-2 text-xs shrink-0">
        <ArrowLeft size={13} />
        {courseCopy.player.backToLesson}
      </button>
    </div>
  );
};
