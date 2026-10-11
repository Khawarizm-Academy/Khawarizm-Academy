import React from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { useVideoPlayerState, videoPlayerActions } from '@/features/courses/context/videoPlayerStore';

/** Persistent mobile mini-player shown when the video stage is not the focus. */
export const PlayerMiniPlayer: React.FC = () => {
  const { activeLesson, selectTab } = useCoursePlayer();
  const video = useVideoPlayerState();
  if (!activeLesson) return null;

  const isPlaying = video.playState === 'playing' || video.playState === 'buffering';
  const progress = video.durationMs > 0 ? (video.currentMs / video.durationMs) * 100 : 0;

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

      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        <span className="text-[10px] text-slate-400 font-body">{courseCopy.player.tabLabel}</span>
        <span className="text-sm text-slate-100 font-body truncate">{activeLesson.title}</span>
        <div className="w-full h-0.5 rounded-full bg-navy-800 overflow-hidden mt-0.5">
          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <button type="button" onClick={() => selectTab('lesson')} className="btn-outline-blue px-3.5 py-2 text-xs shrink-0">
        <ArrowLeft size={13} />
        {courseCopy.player.backToLesson}
      </button>
    </div>
  );
};