import type { StreamGrant, VideoCaptionTrack } from '@/features/videohosting/types';
import type {
  EngineCapabilities,
  EngineEvent,
  PlaybackEngine,
  PlaybackState,
} from './types';

type ListenerMap = {
  [E in EngineEvent['type']]: Set<(event: Extract<EngineEvent, { type: E }>) => void>;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const unsupported = (operation: string): Promise<void> =>
  Promise.reject(new Error(`${operation} is not supported by this playback engine.`));

export abstract class NativeMediaEngine implements PlaybackEngine {
  abstract readonly id: PlaybackEngine['id'];

  protected video: HTMLVideoElement | null = null;
  protected grant: StreamGrant | null = null;
  private readonly listeners: ListenerMap = {
    time: new Set(),
    state: new Set(),
    qualities: new Set(),
    captions: new Set(),
    error: new Set(),
    ready: new Set(),
  };
  private readonly mediaListeners: Array<[string, EventListener]> = [];
  private tracks: HTMLTrackElement[] = [];
  private state: PlaybackState = 'idle';
  private currentCaption: string | null = null;
  private destroyed = false;

  get capabilities(): EngineCapabilities {
    return nativeCapabilitiesFor(this.video);
  }

  async attach(host: HTMLElement, grant: StreamGrant, options: { startAt: number; autoplay: boolean }): Promise<void> {
    this.ensureAlive();
    this.cleanupAttachment();
    this.grant = grant;
    this.video = document.createElement('video');
    this.video.setAttribute('playsinline', '');
    this.video.preload = 'metadata';
    if (grant.poster) this.video.poster = grant.poster;
    host.appendChild(this.video);
    this.bindMediaEvents(this.video);
    this.addCaptionTracks(grant.captions ?? []);
    const source = this.sourceFor(grant);
    if (!source) {
      this.emit({
        type: 'error',
        kind: 'unsupported',
        fatal: true,
        retryable: false,
        detail: 'The playback grant does not contain a playable source.',
      });
      return;
    }
    this.video.src = source;
    this.finishAttach(options);
  }

  protected abstract sourceFor(grant: StreamGrant): string | undefined;

  protected finishAttach(options: { startAt: number; autoplay: boolean }): void {
    if (!this.video) return;
    if (Number.isFinite(options.startAt) && options.startAt > 0) this.video.currentTime = options.startAt;
    this.state = 'ready';
    this.emit({ type: 'state', state: 'ready' });
    this.emit({ type: 'ready' });
    this.emitCaptionState();
    if (options.autoplay) {
      void this.play();
    }
  }

  protected createVideo(host: HTMLElement, grant: StreamGrant): HTMLVideoElement {
    this.cleanupAttachment();
    this.grant = grant;
    this.video = document.createElement('video');
    this.video.setAttribute('playsinline', '');
    this.video.preload = 'metadata';
    if (grant.poster) this.video.poster = grant.poster;
    host.appendChild(this.video);
    this.bindMediaEvents(this.video);
    this.addCaptionTracks(grant.captions ?? []);
    return this.video;
  }

  protected emit(event: EngineEvent): void {
    const subscribers = this.listeners[event.type] as Set<(value: typeof event) => void>;
    subscribers.forEach((listener) => listener(event));
  }

  protected emitError(
    kind: Extract<EngineEvent, { type: 'error' }>['kind'],
    detail: string,
    fatal: boolean,
    retryable: boolean,
    status?: number,
  ): void {
    this.emit({ type: 'error', kind, detail, fatal, retryable, status });
  }

  protected emitCaptionState(): void {
    this.emit({ type: 'captions', tracks: this.grant?.captions ?? [], current: this.currentCaption });
  }

  protected setCurrentCaption(language: string | null): void {
    this.currentCaption = language;
    this.tracks.forEach((track) => {
      if (track.track) track.track.mode = language !== null && track.srclang === language ? 'showing' : 'disabled';
    });
    this.emitCaptionState();
  }

  protected cleanupAttachment(): void {
    this.mediaListeners.forEach(([name, listener]) => this.video?.removeEventListener(name, listener));
    this.mediaListeners.length = 0;
    this.tracks.forEach((track) => track.remove());
    this.tracks = [];
    if (this.video) {
      this.video.removeAttribute('src');
      this.video.remove();
    }
    this.video = null;
    this.grant = null;
    this.currentCaption = null;
    this.state = 'idle';
  }

  private bindMediaEvents(video: HTMLVideoElement): void {
    const add = (name: string, listener: EventListener) => {
      video.addEventListener(name, listener);
      this.mediaListeners.push([name, listener]);
    };
    add('loadedmetadata', () => {
      if (this.state === 'idle') this.state = 'ready';
      this.emit({ type: 'state', state: this.state });
      this.emit({ type: 'ready' });
    });
    add('canplay', () => {
      if (this.state === 'buffering' || this.state === 'idle') {
        this.state = 'ready';
        this.emit({ type: 'state', state: 'ready' });
      }
    });
    add('play', () => this.setState('playing'));
    add('playing', () => this.setState('playing'));
    add('pause', () => {
      if (!video.ended) this.setState('paused');
    });
    add('waiting', () => this.setState('buffering'));
    add('ended', () => this.setState('ended'));
    add('timeupdate', () => this.emitTime());
    add('progress', () => this.emitTime());
    add('error', () => {
      const code = video.error?.code;
      this.emitError(code === MediaError.MEDIA_ERR_NETWORK ? 'network' : 'unknown', video.error?.message ?? 'Media playback failed.', true, code === MediaError.MEDIA_ERR_NETWORK);
    });
  }

  private addCaptionTracks(captions: VideoCaptionTrack[]): void {
    if (!this.video) return;
    captions.forEach((caption) => {
      if (!caption.url) return;
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = caption.label;
      track.srclang = caption.language;
      track.src = caption.url;
      this.video?.appendChild(track);
      track.default = caption.isDefault;
      if (track.track) track.track.mode = caption.isDefault ? 'showing' : 'disabled';
      this.tracks.push(track);
      if (caption.isDefault && this.currentCaption === null) this.currentCaption = caption.language;
    });
  }

  private setState(state: PlaybackState): void {
    this.state = state;
    this.emit({ type: 'state', state });
  }

  private emitTime(): void {
    if (!this.video) return;
    const buffered = this.video.buffered.length > 0 ? this.video.buffered.end(this.video.buffered.length - 1) : 0;
    this.emit({
      type: 'time',
      current: Number.isFinite(this.video.currentTime) ? this.video.currentTime : 0,
      duration: Number.isFinite(this.video.duration) ? this.video.duration : this.grant?.durationSeconds ?? 0,
      buffered,
    });
  }

  protected ensureAlive(): void {
    if (this.destroyed) throw new Error('Playback engine has been destroyed.');
  }

  async play(): Promise<void> {
    this.ensureAlive();
    if (!this.video) return;
    try {
      await this.video.play();
    } catch (error) {
      this.emitError('autoplay_blocked', error instanceof Error ? error.message : 'Playback was blocked by the browser.', false, true);
      throw error;
    }
  }

  pause(): void {
    this.video?.pause();
  }

  seek(seconds: number): void {
    if (this.video) this.video.currentTime = Math.max(0, seconds);
  }

  setRate(rate: number): void {
    if (this.video) this.video.playbackRate = clamp(rate, 0.25, 4);
  }

  setVolume(volume: number): void {
    if (this.video) this.video.volume = clamp(volume, 0, 1);
  }

  setMuted(muted: boolean): void {
    if (this.video) this.video.muted = muted;
  }

  setQuality(id: string | 'auto'): void {
    // Native media has no reliable rendition-switching API.
    void id;
  }

  setCaptions(language: string | null): void {
    this.setCurrentCaption(language);
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }

  requestPictureInPicture(): Promise<void> {
    const request = this.video?.requestPictureInPicture;
    return request ? request.call(this.video).then(() => undefined) : unsupported('Picture-in-picture');
  }

  requestAirPlay(): Promise<void> {
    const video = this.video as (HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void }) | null;
    if (!video?.webkitShowPlaybackTargetPicker) return unsupported('AirPlay');
    video.webkitShowPlaybackTargetPicker();
    return Promise.resolve();
  }

  on<E extends EngineEvent['type']>(type: E, listener: (event: Extract<EngineEvent, { type: E }>) => void): () => void {
    if (this.destroyed) return () => undefined;
    const subscribers = this.listeners[type] as Set<typeof listener>;
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.cleanupAttachment();
    (Object.keys(this.listeners) as EngineEvent['type'][]).forEach((type) => this.listeners[type].clear());
    this.destroyed = true;
  }
}

export function nativeCapabilitiesFor(video: HTMLVideoElement | null): EngineCapabilities {
  const videoWithAirPlay = video as (HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void }) | null;
  const videoWithFullscreen = video as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
  return {
    speed: true,
    quality: false,
    captions: Boolean(video && (video.textTracks?.length || 0) > 0),
    pip: Boolean(
      video &&
      typeof document !== 'undefined' &&
      document.pictureInPictureEnabled &&
      typeof video.requestPictureInPicture === 'function',
    ),
    fullscreen: Boolean(
      typeof document !== 'undefined' &&
      (document.fullscreenEnabled || typeof videoWithFullscreen?.webkitEnterFullscreen === 'function'),
    ),
    seek: Boolean(video),
    airplay: typeof videoWithAirPlay?.webkitShowPlaybackTargetPicker === 'function',
  };
}
