import React, { useState } from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';

/** Persistent mobile mini-player shown when the video stage is not the focus. */
export const PlayerMiniPlayer: React.FC = () => {
  const { activeLesson, selectTab } = useCoursePlayer();
  const [isPlaying, setIsPlaying] = useState(false);
  if (!activeLesson) return null;

  return (
    <div className="player-mini lg:hidden">
      <button
        type="button"
        className="player-mini-play"
        aria-label={courseCopy.player.tabLabel}
        onClick={() => setIsPlaying((playing) => !playing)}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-white translate-x-[-1px]" />}
      </button>

      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        <span className="text-[10px] text-slate-400 font-body">{courseCopy.player.tabLabel}</span>
        <span className="text-sm text-slate-100 font-body truncate">{activeLesson.title}</span>
      </div>

      <button type="button" onClick={() => selectTab('lesson')} className="btn-outline-blue px-3.5 py-2 text-xs shrink-0">
        <ArrowLeft size={13} />
        {courseCopy.player.backToLesson}
      </button>
    </div>
  );
};