import { X } from 'lucide-react';
import { playerCopy } from '@/features/videohosting/data/playerCopy';

export interface ResumePromptProps {
  /** Resume position in seconds, as returned by the playback grant. */
  resumeAtSeconds: number;
  /** Legacy alias retained for callers migrating from the grant field name. */
  resumeAt?: number;
  onResume?: () => void;
  onContinue?: () => void;
  onStartOver: () => void;
  onDismiss: () => void;
}

function formatResumeTime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}

/** Compact, keyboard-friendly resume choice shown before playback begins. */
export function ResumePrompt({
  resumeAtSeconds,
  resumeAt,
  onResume,
  onContinue,
  onStartOver,
  onDismiss,
}: ResumePromptProps) {
  const seconds = Math.max(0, resumeAt ?? resumeAtSeconds);
  const continuePlayback = onResume ?? onContinue ?? onDismiss;

  return (
    <section className="player-resume-prompt" aria-labelledby="player-resume-title">
      <button
          type="button"
          className="player-resume-dismiss"
          aria-label={playerCopy.resumeDismiss}
        onClick={onDismiss}
      >
        <X aria-hidden="true" size={16} />
      </button>
      <div className="player-resume-content">
        <h2 id="player-resume-title" className="player-resume-title">{playerCopy.resumePrefix}</h2>
        <p className="player-resume-time">
          <bdi dir="ltr">{formatResumeTime(seconds)}</bdi>
        </p>
        <div className="player-resume-actions">
          <button type="button" className="player-resume-start-over" onClick={onStartOver}>
            {playerCopy.resumeStartOver}
          </button>
          <button
            type="button"
            className="player-resume-continue"
            onClick={continuePlayback}
            disabled={!continuePlayback}
          >
            {playerCopy.resumeDismiss}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ResumePrompt;
