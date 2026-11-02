import type { StreamGrant, VideoCaptionTrack } from '@/features/videohosting/types';
import type { EngineCapabilities, EngineEvent, PlaybackEngine, PlaybackState, QualityLevel } from './types';
import { unsupported } from './mediaEngine';

type ListenerMap = {
  [E in EngineEvent['type']]: Set<(event: Extract<EngineEvent, { type: E }>) => void>;
};

export abstract class EmbedEngine implements PlaybackEngine {
  abstract readonly id: PlaybackEngine['id'];
  abstract readonly capabilities: EngineCapabilities;
  protected iframe: HTMLIFrameElement | null = null;
  protected grant: StreamGrant | null = null;
  protected destroyed = false;
  protected timer: number | null = null;
  private readonly listeners: ListenerMap = {
    time: new Set(),
    state: new Set(),
    qualities: new Set(),
    captions: new Set(),
    error: new Set(),
    ready: new Set(),
  };

  protected createIframe(host: HTMLElement, grant: StreamGrant): HTMLIFrameElement | null {
    this.cleanupEmbed();
    const provider = grant.provider?.toLowerCase();
    let embedUrl: URL | null = null;
    try {
      if (grant.embedUrl) embedUrl = new URL(grant.embedUrl);
    } catch {
      embedUrl = null;
    }
    const allowedHost = (provider === 'youtube' && embedUrl?.hostname === 'www.youtube-nocookie.com')
      || (provider === 'vimeo' && embedUrl?.hostname === 'player.vimeo.com');
    if (
      grant.mode !== 'embed' ||
      !embedUrl ||
      embedUrl.protocol !== 'https:' ||
      embedUrl.username !== '' ||
      embedUrl.password !== '' ||
      embedUrl.port !== '' ||
      !allowedHost
    ) {
      this.emit({ type: 'error', kind: 'unsupported', fatal: true, retryable: false, detail: 'The embed grant does not contain a validated embed URL.' });
      return null;
    }
    this.grant = grant;
    this.iframe = document.createElement('iframe');
    this.iframe.src = embedUrl.toString();
    this.iframe.referrerPolicy = 'no-referrer';
    this.iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
    this.iframe.setAttribute('allowfullscreen', '');
    this.iframe.title = grant.assetId || 'Embedded lesson video';
    host.appendChild(this.iframe);
    return this.iframe;
  }

  protected finishReady(): void {
    this.emit({ type: 'state', state: 'ready' });
    this.emit({ type: 'ready' });
    this.emit({ type: 'captions', tracks: this.grant?.captions ?? [], current: null });
    this.emitQualities();
  }

  protected setState(state: PlaybackState): void {
    this.emit({ type: 'state', state });
  }

  protected emitTime(current: number, duration: number, buffered = 0): void {
    this.emit({ type: 'time', current, duration, buffered });
  }

  protected emitError(kind: Extract<EngineEvent, { type: 'error' }>['kind'], detail: string, fatal: boolean, retryable: boolean): void {
    this.emit({ type: 'error', kind, detail, fatal, retryable });
  }

  protected emitQualities(current = 'auto'): void {
    const levels: QualityLevel[] = (this.grant?.qualities ?? []).map((quality) => ({
      id: quality.quality,
      label: quality.quality,
      height: quality.height,
      bandwidthBps: quality.bandwidthBps,
    }));
    if (levels.length > 0) this.emit({ type: 'qualities', levels, current });
  }

  protected startTimer(readTime: () => Promise<void> | void): void {
    this.stopTimer();
    this.timer = window.setInterval(() => void readTime(), 250);
  }

  protected stopTimer(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  protected cleanupEmbed(): void {
    this.stopTimer();
    try {
      this.cleanupProvider();
    } catch {
      // Provider SDK destruction must not prevent removal of the old iframe.
    }
    if (this.iframe) this.iframe.remove();
    this.iframe = null;
    this.grant = null;
  }

  protected cleanupProvider(): void {}

  protected emit(event: EngineEvent): void {
    const subscribers = this.listeners[event.type] as Set<(value: typeof event) => void>;
    subscribers.forEach((listener) => listener(event));
  }

  protected ensureAlive(): void {
    if (this.destroyed) throw new Error('Playback engine has been destroyed.');
  }

  abstract attach(host: HTMLElement, grant: StreamGrant, options: { startAt: number; autoplay: boolean }): Promise<void>;
  abstract play(): Promise<void>;
  abstract pause(): void;
  abstract seek(seconds: number): void;
  abstract setRate(rate: number): void;
  abstract setVolume(volume: number): void;
  abstract setMuted(muted: boolean): void;
  abstract setQuality(id: string | 'auto'): void;
  abstract setCaptions(language: string | null): void;

  getVideoElement(): HTMLVideoElement | null {
    return null;
  }

  requestPictureInPicture(): Promise<void> {
    return unsupported('Picture-in-picture for an embedded player');
  }

  requestAirPlay(): Promise<void> {
    return unsupported('AirPlay for an embedded player');
  }

  on<E extends EngineEvent['type']>(type: E, listener: (event: Extract<EngineEvent, { type: E }>) => void): () => void {
    if (this.destroyed) return () => undefined;
    const subscribers = this.listeners[type] as Set<typeof listener>;
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.cleanupEmbed();
    (Object.keys(this.listeners) as EngineEvent['type'][]).forEach((type) => this.listeners[type].clear());
    this.destroyed = true;
  }

  protected captions(): VideoCaptionTrack[] {
    return this.grant?.captions ?? [];
  }
}
