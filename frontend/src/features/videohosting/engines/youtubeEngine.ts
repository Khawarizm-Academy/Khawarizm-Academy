import type { StreamGrant } from '@/features/videohosting/types';
import type { EngineCapabilities } from './types';
import { EmbedEngine } from './embedEngine';

type YouTubePlayer = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoLoadedFraction: () => number;
  setOption?: (module: string, option: string, value: Record<string, string>) => void;
};
type YouTubeApi = {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
        onError: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
};
type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };

let apiPromise: Promise<YouTubeApi> | null = null;

const loadYouTubeApi = (): Promise<YouTubeApi> => {
  const browser = window as YouTubeWindow;
  if (browser.YT?.Player) return Promise.resolve(browser.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previous = browser.onYouTubeIframeAPIReady;
    const finish = () => {
      if (browser.YT?.Player) resolve(browser.YT);
      else reject(new Error('The YouTube IFrame API did not initialize.'));
    };
    browser.onYouTubeIframeAPIReady = () => {
      previous?.();
      finish();
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-khawarizm-youtube-api]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.khawarizmYoutubeApi = 'true';
      script.addEventListener('error', () => reject(new Error('Unable to load the YouTube IFrame API.')), { once: true });
      document.head.appendChild(script);
    }
    if (browser.YT?.Player) finish();
  });
  void apiPromise.catch(() => {
    apiPromise = null;
  });
  return apiPromise;
};

const youtubeCapabilities: EngineCapabilities = {
  speed: true,
  quality: false,
  captions: false,
  pip: false,
  fullscreen: false,
  seek: true,
  airplay: false,
};

class YouTubeEngine extends EmbedEngine {
  readonly id = 'youtube' as const;
  private preferredRate = 1;
  private preferredVolume = 1;
  private preferredMuted = false;
  private preferredCaption: string | null = null;
  private player: YouTubePlayer | null = null;
  private api: YouTubeApi | null = null;

  get capabilities(): EngineCapabilities {
    return {
      ...youtubeCapabilities,
      captions: this.captions().length > 0,
      fullscreen: typeof document !== 'undefined' && document.fullscreenEnabled,
    };
  }

  async attach(host: HTMLElement, grant: StreamGrant, options: { startAt: number; autoplay: boolean }): Promise<void> {
    this.ensureAlive();
    const iframe = this.createIframe(host, grant);
    if (!iframe) return;
    try {
      const api = await loadYouTubeApi();
      if (this.iframe !== iframe) return;
      this.api = api;
      let player: YouTubePlayer | null = null;
      player = new api.Player(iframe, {
        events: {
          onReady: () => {
            if (!player || this.player !== player || this.iframe !== iframe) return;
            if (options.startAt > 0) player.seekTo(options.startAt, true);
            this.finishReady();
            this.applyPreferences();
            this.startTimer(() => this.readTime());
            if (options.autoplay) void this.play();
          },
          onStateChange: (event) => {
            if (player && this.player === player) this.handleState(event.data);
          },
          onError: (event) => {
            if (player && this.player === player) this.handleError(event.data);
          },
        },
      });
      this.player = player;
    } catch (error) {
      if (this.iframe === iframe) {
        this.emitError('network', error instanceof Error ? error.message : 'Unable to load the YouTube player.', true, true);
      }
    }
  }

  private handleState(value: number): void {
    if (!this.api) return;
    const states = this.api.PlayerState;
    if (value === states.PLAYING) this.setState('playing');
    else if (value === states.PAUSED || value === states.CUED) this.setState('paused');
    else if (value === states.BUFFERING) this.setState('buffering');
    else if (value === states.ENDED) this.setState('ended');
  }

  private handleError(code: number): void {
    const unsupportedVideo = code === 2 || code === 5 || code === 100 || code === 101 || code === 150;
    this.emitError(unsupportedVideo ? 'unsupported' : 'network', `YouTube player error ${code}.`, true, !unsupportedVideo);
  }

  private async readTime(): Promise<void> {
    if (!this.player) return;
    const duration = this.player.getDuration();
    const current = this.player.getCurrentTime();
    const fraction = this.player.getVideoLoadedFraction();
    this.emitTime(current, duration, duration * fraction);
  }

  private applyPreferences(): void {
    if (!this.player) return;
    this.player.setPlaybackRate(Math.min(Math.max(this.preferredRate, 0.25), 2));
    this.player.setVolume(Math.min(Math.max(this.preferredVolume, 0), 1) * 100);
    if (this.preferredMuted) this.player.mute();
    else this.player.unMute();
    this.setCaptions(this.preferredCaption);
  }

  async play(): Promise<void> {
    this.ensureAlive();
    this.player?.playVideo();
  }

  pause(): void {
    this.player?.pauseVideo();
  }

  seek(seconds: number): void {
    this.player?.seekTo(Math.max(0, seconds), true);
  }

  setRate(rate: number): void {
    this.preferredRate = Math.min(Math.max(rate, 0.25), 2);
    this.player?.setPlaybackRate(this.preferredRate);
  }

  setVolume(volume: number): void {
    this.preferredVolume = Math.min(Math.max(volume, 0), 1);
    this.player?.setVolume(this.preferredVolume * 100);
  }

  setMuted(muted: boolean): void {
    this.preferredMuted = muted;
    if (muted) this.player?.mute();
    else this.player?.unMute();
  }

  setQuality(id: string | 'auto'): void {
    void id;
  }

  setCaptions(language: string | null): void {
    this.preferredCaption = language;
    this.player?.setOption?.('captions', 'track', language ? { languageCode: language } : {});
    this.emit({ type: 'captions', tracks: this.captions(), current: language });
  }

  protected cleanupProvider(): void {
    this.player?.destroy();
    this.player = null;
    this.api = null;
  }
}

export const createEngine = () => new YouTubeEngine();
export const engineModule = { createEngine };
export default engineModule;
