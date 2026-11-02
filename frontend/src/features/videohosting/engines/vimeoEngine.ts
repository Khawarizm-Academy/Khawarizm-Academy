import type VimeoPlayer from '@vimeo/player';
import type { StreamGrant } from '@/features/videohosting/types';
import type { EngineCapabilities } from './types';
import { EmbedEngine } from './embedEngine';

type VimeoLike = VimeoPlayer;
const vimeoCapabilities: EngineCapabilities = {
  speed: true,
  quality: false,
  captions: false,
  pip: false,
  fullscreen: false,
  seek: true,
  airplay: false,
};

class VimeoEngine extends EmbedEngine {
  readonly id = 'vimeo' as const;
  private preferredRate = 1;
  private preferredVolume = 1;
  private preferredMuted = false;
  private preferredCaption: string | null = null;
  private player: VimeoLike | null = null;
  private sdkHandlers: Array<{ event: string; handler: (...args: never[]) => void }> = [];

  get capabilities(): EngineCapabilities {
    return {
      ...vimeoCapabilities,
      captions: this.captions().length > 0,
      fullscreen: typeof document !== 'undefined' && document.fullscreenEnabled,
    };
  }

  async attach(host: HTMLElement, grant: StreamGrant, options: { startAt: number; autoplay: boolean }): Promise<void> {
    this.ensureAlive();
    const iframe = this.createIframe(host, grant);
    if (!iframe) return;
    try {
      const sdk = await import('@vimeo/player');
      if (this.iframe !== iframe) return;
      const Player = sdk.default;
      const player = new Player(iframe);
      this.player = player;
      this.bindSdkEvents(player);
      await player.ready();
      if (this.iframe !== iframe || this.player !== player) return;
      if (options.startAt > 0) await player.setCurrentTime(options.startAt);
      this.finishReady();
      this.applyPreferences(player);
      this.startTimer(() => this.readTime(player));
      if (options.autoplay) void this.play();
    } catch (error) {
      if (this.iframe === iframe) {
        this.emitError('network', error instanceof Error ? error.message : 'Unable to load the Vimeo player.', true, true);
      }
    }
  }

  private bindSdkEvents(player: VimeoLike): void {
    const bind = (event: string, handler: (...args: never[]) => void) => {
      const guarded = ((...args: never[]) => {
        if (this.player === player) handler(...args);
      }) as (...args: never[]) => void;
      player.on(event as never, guarded as never);
      this.sdkHandlers.push({ event, handler: guarded });
    };
    bind('play', () => this.setState('playing'));
    bind('playing', () => this.setState('playing'));
    bind('pause', () => this.setState('paused'));
    bind('bufferstart', () => this.setState('buffering'));
    bind('bufferend', () => this.setState('playing'));
    bind('ended', () => this.setState('ended'));
    bind('timeupdate', (data) => {
      const event = data as unknown as { seconds?: number; duration?: number; percent?: number };
      this.emitTime(event.seconds ?? 0, event.duration ?? this.grant?.durationSeconds ?? 0, (event.duration ?? 0) * (event.percent ?? 0));
    });
    bind('qualitychange', () => undefined);
    bind('texttrackchange', (data) => {
      const event = data as unknown as { language?: string | null };
      this.emit({ type: 'captions', tracks: this.captions(), current: event.language ?? null });
    });
    bind('error', (data) => {
      const event = data as unknown as { message?: string; name?: string };
      this.emitError('network', event.message ?? event.name ?? 'Vimeo playback failed.', true, true);
    });
  }

  private async readTime(player: VimeoLike): Promise<void> {
    if (this.player !== player) return;
    const [current, duration, buffered] = await Promise.all([
      player.getCurrentTime(),
      player.getDuration(),
      player.getBuffered(),
    ]);
    if (this.player !== player) return;
    const last = buffered.at(-1);
    this.emitTime(current, duration, last ? last.end : 0);
  }

  private applyPreferences(player: VimeoLike): void {
    void player.setPlaybackRate(Math.min(Math.max(this.preferredRate, 0.5), 2)).catch(() => undefined);
    void player.setVolume(Math.min(Math.max(this.preferredVolume, 0), 1)).catch(() => undefined);
    void player.setMuted(this.preferredMuted).catch(() => undefined);
    if (this.preferredCaption) {
      void player.enableTextTrack(this.preferredCaption).catch(() => undefined);
    } else {
      void player.disableTextTrack().catch(() => undefined);
    }
  }

  async play(): Promise<void> {
    this.ensureAlive();
    try {
      await this.player?.play();
    } catch (error) {
      this.emitError('autoplay_blocked', error instanceof Error ? error.message : 'Vimeo playback was blocked.', false, true);
      throw error;
    }
  }

  pause(): void {
    void this.player?.pause().catch(() => undefined);
  }

  seek(seconds: number): void {
    void this.player?.setCurrentTime(Math.max(0, seconds)).catch(() => undefined);
  }

  setRate(rate: number): void {
    this.preferredRate = Math.min(Math.max(rate, 0.5), 2);
    void this.player?.setPlaybackRate(this.preferredRate).catch(() => undefined);
  }

  setVolume(volume: number): void {
    this.preferredVolume = Math.min(Math.max(volume, 0), 1);
    void this.player?.setVolume(this.preferredVolume).catch(() => undefined);
  }

  setMuted(muted: boolean): void {
    this.preferredMuted = muted;
    void this.player?.setMuted(muted).catch(() => undefined);
  }

  setQuality(id: string | 'auto'): void {
    void id;
  }

  setCaptions(language: string | null): void {
    this.preferredCaption = language;
    if (language) void this.player?.enableTextTrack(language).catch(() => undefined);
    else void this.player?.disableTextTrack().catch(() => undefined);
    this.emit({ type: 'captions', tracks: this.captions(), current: language });
  }

  protected cleanupProvider(): void {
    const player = this.player;
    this.player = null;
    this.sdkHandlers.forEach(({ event, handler }) => player?.off(event as never, handler as never));
    this.sdkHandlers = [];
    if (player) void player.destroy().catch(() => undefined);
  }
}

export const createEngine = () => new VimeoEngine();
export const engineModule = { createEngine };
export default engineModule;
