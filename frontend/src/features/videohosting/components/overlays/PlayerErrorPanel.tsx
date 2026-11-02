import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, UserPlus } from 'lucide-react';
import { playerCopy } from '@/features/videohosting/data/playerCopy';

export type PlayerErrorCause =
  | 'no_video'
  | 'not_entitled'
  | 'not_ready'
  | 'staged'
  | 'processing'
  | 'conflict'
  | 'not_found'
  | 'raw_busy'
  | 'unsupported'
  | 'autoplay_blocked'
  | 'network'
  | 'generic';

interface PlayerErrorShape {
  code?: string | null;
  status?: number | string | null;
}

export interface PlayerErrorPanelProps {
  code: string;
  errorCode?: string | null;
  status?: number | string | null;
  errorStatus?: number | string | null;
  error?: PlayerErrorShape | null;
  /** The detail is accepted for callers that already have it, but is never rendered. */
  message?: string | null;
  errorMessage?: string | null;
  onRetry: () => void;
  onEnroll?: () => void;
  children?: ReactNode;
}

const readinessCodes = new Set(['not_ready', 'staged', 'processing', 'conflict']);

function classifyPlayerError(
  code: string | null | undefined,
  status: number | string | null | undefined,
): PlayerErrorCause {
  const normalized = String(code ?? '').trim().toLowerCase().replaceAll('-', '_');
  const numericStatus = typeof status === 'string' ? Number(status) : status;

  if (normalized === 'no_video' || normalized === 'no_video_available') return 'no_video';
  if (normalized === 'not_entitled' || normalized === 'forbidden' || normalized === '403') return 'not_entitled';
  if (readinessCodes.has(normalized)) return normalized as PlayerErrorCause;
  if (normalized === 'not_found' || normalized === '404' || numericStatus === 404) return 'not_found';
  if (normalized === 'raw_busy') return 'raw_busy';
  if (normalized === 'unsupported' || normalized === 'media_unsupported') return 'unsupported';
  if (normalized === 'autoplay_blocked' || normalized === 'autoplay') return 'autoplay_blocked';
  if (
    normalized === 'network' ||
    normalized === 'offline' ||
    normalized === 'network_error' ||
    normalized === 'timeout' ||
    normalized === 'fetch_error'
  ) {
    return 'network';
  }
  return 'generic';
}

interface ErrorCopy {
  title: string;
  note: string;
}

function copyFor(cause: PlayerErrorCause): ErrorCopy {
  switch (cause) {
    case 'no_video':
      return { title: playerCopy.noVideoTitle, note: playerCopy.noVideoNote };
    case 'not_entitled':
      return { title: playerCopy.notEntitledTitle, note: playerCopy.notEntitledNote };
    case 'not_ready':
    case 'staged':
    case 'processing':
    case 'conflict':
      return { title: playerCopy.notReadyTitle, note: playerCopy.notReadyNote };
    case 'not_found':
      return { title: playerCopy.notFoundTitle, note: playerCopy.noVideoNote };
    case 'raw_busy':
      return { title: playerCopy.rawBusyTitle, note: playerCopy.networkNote };
    case 'unsupported':
      return { title: playerCopy.unsupportedTitle, note: playerCopy.unsupportedNote };
    case 'autoplay_blocked':
      return { title: playerCopy.autoplayTitle, note: playerCopy.autoplayNote };
    case 'network':
      return { title: playerCopy.networkTitle, note: playerCopy.networkNote };
    case 'generic':
    default:
      return {
        title: 'تعذر تشغيل الفيديو',
        note: 'حدثت مشكلة أثناء تشغيل الفيديو. أعد المحاولة للمتابعة.',
      };
  }
}

/** A safe, localized error surface: API details never replace the cause-specific copy. */
export function PlayerErrorPanel({
  code,
  errorCode,
  status,
  errorStatus,
  error,
  onRetry,
  onEnroll,
}: PlayerErrorPanelProps) {
  const classifiedCause = classifyPlayerError(error?.code ?? errorCode ?? code, error?.status ?? errorStatus ?? status);
  const cause = classifiedCause === 'generic' && typeof navigator !== 'undefined' && navigator.onLine === false
    ? 'network'
    : classifiedCause;
  const copy = copyFor(cause);

  return (
    <section className="player-error-panel" role="alert" aria-labelledby="player-error-title">
      <AlertTriangle aria-hidden="true" className="player-error-icon" size={28} />
      <div className="player-error-content">
        <h2 id="player-error-title" className="player-error-title">{copy.title}</h2>
        <p className="player-error-note">{copy.note}</p>
        <div className="player-error-actions">
          <button type="button" className="player-error-retry" onClick={onRetry}>
            <RefreshCw aria-hidden="true" size={15} />
            {playerCopy.retryLabel}
          </button>
          {cause === 'not_entitled' && onEnroll && (
            <button type="button" className="player-error-enroll" onClick={onEnroll}>
              <UserPlus aria-hidden="true" size={15} />
              {playerCopy.enrollLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default PlayerErrorPanel;
