import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { mintStreamGrant } from '@/features/videohosting/data/videoHostingFetchers';

/** What the stage renders while the hls.js instance attaches and streams. */
export interface HlsPlayback {
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage: string | null;
  /** Retry a failed attach (mints a fresh grant). */
  reload: () => void;
}

/**
 * Attach an hls.js instance to a `<video>` element for one encrypted-HLS asset.
 *
 * Native HLS (Safari/iOS) plays the master URL directly; every other browser
 * drives hls.js. Segments redirect to Telegram's CDN, so this hook never sees
 * video bytes — it just hands the element the tokenized master and reacts to
 * media events.
 */
export function useHlsPlayback(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  slug: string | null,
): HlsPlayback {
  const [status, setStatus] = useState<HlsPlayback['status']>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !slug) return;

    let cancelled = false;
    let hls: Hls | null = null;
    setStatus('loading');
    setErrorMessage(null);

    // Each mount mints a fresh grant: tokens are IP-bound and expire, so a
    // cached one would be rejected on a later lesson.
    void mintStreamGrant(slug)
      .then((grant) => {
        if (cancelled) return;
        if (element.canPlayType('application/vnd.apple.mpegurl')) {
          element.src = grant.masterUrl;
          setStatus('ready');
          return;
        }
        if (!Hls.isSupported()) {
          setStatus('error');
          setErrorMessage('هذا المتصفح لا يدعم تشغيل HLS.');
          return;
        }
        hls = new Hls({ enableWorker: true, lowLatencyMode: false, maxBufferLength: 30 });
        hlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return; // non-fatal errors self-recover
          setStatus('error');
          setErrorMessage(data.details ?? 'تعذر تشغيل الفيديو.');
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => setStatus('ready'));
        hls.loadSource(grant.masterUrl);
        hls.attachMedia(element);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'تعذر تجهيز رابط المشاهدة.');
      });

    return () => {
      cancelled = true;
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
    };
  }, [videoRef, slug, attempt]);

  const reload = () => setAttempt((value) => value + 1);

  return { status, errorMessage, reload };
}
