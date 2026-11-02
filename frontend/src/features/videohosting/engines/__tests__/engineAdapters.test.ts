import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StreamGrant } from '@/features/videohosting/types';
import { resolveEngineLoader } from '../registry';
import { createEngine as createFileEngine } from '../fileEngine';
import { createEngine as createHlsEngine } from '../hlsEngine';
import { createEngine as createVimeoEngine } from '../vimeoEngine';
import { createEngine as createYouTubeEngine } from '../youtubeEngine';

const hlsMock = vi.hoisted(() => ({ instances: [] as Array<{ trigger: (event: string, data: unknown) => void; destroyed: boolean }> }));
vi.mock('hls.js', () => {
  class MockHls {
    static isSupported = () => true;
    static Events = {
      MANIFEST_PARSED: 'manifestParsed',
      LEVEL_SWITCHED: 'levelSwitched',
      SUBTITLE_TRACKS_UPDATED: 'subtitleTracksUpdated',
      ERROR: 'error',
    };
    levels = [{ height: 360, bitrate: 500_000 }, { height: 720, bitrate: 1_500_000 }];
    currentLevel = -1;
    subtitleTrack = -1;
    destroyed = false;
    private readonly listeners = new Map<string, (event: string, data: unknown) => void>();
    constructor(options: unknown) {
      void options;
      hlsMock.instances.push(this);
    }
    on(event: string, listener: (event: string, data: unknown) => void): void {
      this.listeners.set(event, listener);
    }
    trigger(event: string, data: unknown): void {
      this.listeners.get(event)?.(event, data);
    }
    loadSource(source: string): void { void source; }
    attachMedia(video: HTMLVideoElement): void { void video; }
    startLoad(): void {}
    recoverMediaError(): void {}
    destroy(): void {
      this.destroyed = true;
      this.listeners.clear();
    }
  }
  return { default: MockHls };
});

const vimeoMock = vi.hoisted(() => ({ instances: [] as Array<{ off: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }> }));
vi.mock('@vimeo/player', () => {
  class MockPlayer {
    readonly off = vi.fn();
    readonly destroy = vi.fn(async () => undefined);
    readonly handlers = new Map<string, (...args: never[]) => void>();
    constructor(iframe: HTMLIFrameElement) {
      void iframe;
      vimeoMock.instances.push(this);
    }
    ready = async () => undefined;
    on(event: string, handler: (...args: never[]) => void): void {
      this.handlers.set(event, handler);
    }
    async play(): Promise<void> {}
    async pause(): Promise<void> {}
    async setCurrentTime(seconds: number): Promise<number> { void seconds; return 0; }
    async setPlaybackRate(rate: number): Promise<number> { void rate; return 1; }
    async setVolume(volume: number): Promise<number> { void volume; return 1; }
    async setMuted(muted: boolean): Promise<boolean> { void muted; return true; }
    async getCurrentTime(): Promise<number> { return 2; }
    async getDuration(): Promise<number> { return 10; }
    async getBuffered(): Promise<Array<{ start: number; end: number }>> { return [{ start: 0, end: 4 }]; }
    async setQuality(quality: never): Promise<never> { void quality; throw new Error('not used'); }
    async enableTextTrack(language: string): Promise<never> { void language; throw new Error('not used'); }
    async disableTextTrack(): Promise<void> {}
  }
  return { default: MockPlayer };
});

const grant = (overrides: Partial<StreamGrant> = {}): StreamGrant => ({
  token: 'token',
  assetId: 'asset',
  mode: 'raw',
  playUrl: 'https://cdn.example/video.mp4',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  ...overrides,
});

beforeEach(() => {
  hlsMock.instances.length = 0;
  vimeoMock.instances.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
  delete (window as Window & { YT?: unknown }).YT;
});

describe('playback engine registry', () => {
  it('maps stored modes and providers, returning null for unsupported grants', async () => {
    expect(resolveEngineLoader(grant({ mode: undefined }))).toBeNull();
    expect(resolveEngineLoader(grant({ mode: 'embed', provider: 'unknown' }))).toBeNull();
    expect((await resolveEngineLoader(grant({ mode: 'raw' }))!()).createEngine().id).toBe('file');
    expect((await resolveEngineLoader(grant({ mode: 'external', sourceUrl: 'https://example.test/v.mp4' }))!()).createEngine().id).toBe('file');
    expect((await resolveEngineLoader(grant({ mode: 'embed', provider: 'youtube', embedUrl: 'https://youtube.test/embed/abc' }))!()).createEngine().id).toBe('youtube');
    expect((await resolveEngineLoader(grant({ mode: 'embed', provider: 'vimeo', embedUrl: 'https://player.vimeo.com/video/1' }))!()).createEngine().id).toBe('vimeo');
  });

  it('selects native HLS when the browser advertises native HLS support', async () => {
    const original = HTMLMediaElement.prototype.canPlayType;
    Object.defineProperty(HTMLMediaElement.prototype, 'canPlayType', { configurable: true, value: () => 'probably' });
    const engine = (await resolveEngineLoader(grant({ mode: 'hls', masterUrl: 'https://cdn.example/master.m3u8' }))!()).createEngine();
    expect(engine.id).toBe('native');
    Object.defineProperty(HTMLMediaElement.prototype, 'canPlayType', { configurable: true, value: original });
  });
});

describe('native file adapter', () => {
  it('attaches a video, controls it, emits events, and destroys idempotently', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const engine = createFileEngine();
    const states: string[] = [];
    engine.on('state', (event) => states.push(event.state));
    await engine.attach(host, grant({ captions: [{ language: 'en', label: 'English', url: '/en.vtt', isDefault: true }] }), { startAt: 4, autoplay: false });
    const video = engine.getVideoElement();
    expect(video?.src).toContain('/video.mp4');
    expect(video?.querySelector('track')?.getAttribute('src')).toContain('/en.vtt');
    engine.setVolume(0.4);
    engine.setMuted(true);
    engine.setRate(1.5);
    engine.seek(7);
    video?.dispatchEvent(new Event('playing'));
    expect(states).toContain('ready');
    expect(states).toContain('playing');
    engine.destroy();
    engine.destroy();
    expect(host.querySelector('video')).toBeNull();
    expect(engine.getVideoElement()).toBeNull();
  });
});

describe('HLS adapter', () => {
  it('loads Hls lazily, exposes levels, normalizes errors, and cleans up the Hls instance', async () => {
    const host = document.createElement('div');
    const engine = createHlsEngine();
    const qualities: string[] = [];
    const errors: string[] = [];
    engine.on('qualities', (event) => qualities.push(event.current));
    engine.on('error', (event) => errors.push(`${event.kind}:${event.status ?? ''}`));
    await engine.attach(host, grant({ mode: 'hls', masterUrl: 'https://cdn.example/master.m3u8' }), { startAt: 0, autoplay: false });
    const hls = hlsMock.instances[0];
    hls.trigger('manifestParsed', { levels: hlsMock.instances[0] ? [{ height: 360, bitrate: 500_000 }, { height: 720, bitrate: 1_500_000 }] : [] });
    expect(qualities).toContain('auto');
    engine.setQuality('1');
    hls.trigger('error', { fatal: true, response: { status: 403 }, details: 'HTTP 403' });
    expect(errors).toContain('token_invalid:403');
    engine.destroy();
    engine.destroy();
    expect(hls.destroyed).toBe(true);
    expect(host.childElementCount).toBe(0);
  });
});

describe('embed adapters', () => {
  it('uses the no-cookie YouTube embed URL, no-referrer policy, and clears its timer on destroy', async () => {
    vi.useFakeTimers();
    let config: { events: { onReady: () => void } } | undefined;
    const player = { playVideo: vi.fn(), pauseVideo: vi.fn(), seekTo: vi.fn(), setPlaybackRate: vi.fn(), setVolume: vi.fn(), mute: vi.fn(), unMute: vi.fn(), setPlaybackQuality: vi.fn(), getCurrentTime: () => 1, getDuration: () => 2, getVideoLoadedFraction: () => 1, destroy: vi.fn() };
    (window as unknown as Window & { YT: unknown }).YT = {
      Player: class {
        constructor(_iframe: HTMLIFrameElement, options: { events: { onReady: () => void } }) {
          config = options;
          return player;
        }
      },
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
    };
    const host = document.createElement('div');
    const engine = createYouTubeEngine();
    await engine.attach(host, grant({ mode: 'embed', provider: 'youtube', embedUrl: 'https://www.youtube-nocookie.com/embed/validated' }), { startAt: 0, autoplay: false });
    config?.events.onReady();
    expect(host.querySelector('iframe')?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/validated');
    expect(host.querySelector('iframe')?.referrerPolicy).toBe('no-referrer');
    expect(engine.capabilities.quality).toBe(false);
    expect(vi.getTimerCount()).toBe(1);
    engine.destroy();
    engine.destroy();
    expect(vi.getTimerCount()).toBe(0);
    expect(host.childElementCount).toBe(0);
  });

  it('rejects a YouTube grant whose iframe host is not the provider allowlist', async () => {
    const host = document.createElement('div');
    const engine = createYouTubeEngine();
    const errors: string[] = [];
    engine.on('error', (event) => errors.push(event.kind));
    await engine.attach(host, grant({
      mode: 'embed',
      provider: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com.attacker.example/embed/abc',
    }), { startAt: 0, autoplay: false });
    expect(host.querySelector('iframe')).toBeNull();
    expect(errors).toContain('unsupported');
    engine.destroy();
  });

  it('binds and removes Vimeo SDK listeners and reports no video element for embeds', async () => {
    const host = document.createElement('div');
    const engine = createVimeoEngine();
    await engine.attach(host, grant({ mode: 'embed', provider: 'vimeo', embedUrl: 'https://player.vimeo.com/video/1' }), { startAt: 0, autoplay: false });
    expect(engine.getVideoElement()).toBeNull();
    expect(engine.capabilities.pip).toBe(false);
    const player = vimeoMock.instances[0];
    engine.destroy();
    engine.destroy();
    expect(player.off).toHaveBeenCalled();
    expect(player.destroy).toHaveBeenCalledTimes(1);
    expect(host.childElementCount).toBe(0);
  });

  it('cleans the previous Vimeo SDK player before reattaching the same engine', async () => {
    const host = document.createElement('div');
    const engine = createVimeoEngine();
    await engine.attach(host, grant({ mode: 'embed', provider: 'vimeo', embedUrl: 'https://player.vimeo.com/video/1' }), { startAt: 0, autoplay: false });
    const firstPlayer = vimeoMock.instances[0];
    await engine.attach(host, grant({ mode: 'embed', provider: 'vimeo', embedUrl: 'https://player.vimeo.com/video/2' }), { startAt: 0, autoplay: false });
    const secondPlayer = vimeoMock.instances[1];
    expect(firstPlayer.off).toHaveBeenCalled();
    expect(firstPlayer.destroy).toHaveBeenCalledOnce();
    expect(host.querySelector('iframe')?.src).toContain('/video/2');
    expect(engine.capabilities.quality).toBe(false);
    engine.destroy();
    expect(secondPlayer.off).toHaveBeenCalled();
    expect(secondPlayer.destroy).toHaveBeenCalledOnce();
  });
});
