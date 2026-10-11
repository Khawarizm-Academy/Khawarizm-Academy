import React, { useState } from 'react';
import { Captions, Gauge, Pause, Play, SlidersHorizontal } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { PlayerSelectMenu } from '@/features/courses/components/controls/PlayerSelectMenu';

/** Simulated 16:9 stage: poster, play toggle, seek bar and the tool menus. */
export const PlayerStage: React.FC = () => {
  const { course, activeLesson } = useCoursePlayer();
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(courseCopy.player.speeds[1]);
  const [quality, setQuality] = useState(courseCopy.player.qualities[0]);
  const [captions, setCaptions] = useState(true);

  if (!course) return null;

  return (
    <div className="player-stage group">
      <img src={course.thumbnailUrl} alt={activeLesson?.title ?? course.title} className="player-video" />
      <div className="player-video-shade" />

      <button type="button" className="player-play" onClick={() => setIsPlaying((playing) => !playing)}>
        {isPlaying ? (
          <Pause size={28} className="fill-white" />
        ) : (
          <Play size={28} className="fill-white translate-x-[-1px]" />
        )}
      </button>

      <div className="player-video-tools">
        <div className="player-video-seek">
          <div className="player-video-seek-fill" style={{ width: '35%' }} />
        </div>
        <span className="player-tool-label tabular-nums">{activeLesson?.duration ?? '00:00'}</span>

        <button
          type="button"
          className="player-tool"
          aria-label={courseCopy.player.captionsLabel}
          onClick={() => setCaptions((on) => !on)}
        >
          <Captions size={15} className={captions ? 'text-blue-400' : ''} />
        </button>

        <PlayerSelectMenu
          icon={Gauge}
          label={courseCopy.player.speedLabel}
          value={speed}
          options={courseCopy.player.speeds}
          onSelect={setSpeed}
        />
        <PlayerSelectMenu
          icon={SlidersHorizontal}
          label={courseCopy.player.qualityLabel}
          value={quality}
          options={courseCopy.player.qualities}
          onSelect={setQuality}
        />
      </div>
    </div>
  );
};