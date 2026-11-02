import type Hls from 'hls.js';
import type { StreamGrant } from '@/features/videohosting/types';
import type { EngineCapabilities, QualityLevel } from './types';
import { NativeMediaEngine, nativeCapabilitiesFor } from './mediaEngine';

const hlsCapabilities: EngineCapabilities = {
  speed: true,
  quality: true,
  captions: true,
  pip: true,
  fullscreen: true,
  seek: true,
  airplay: true,
};

type HlsLevel = { height?: number; bitrate?: number; name?: string; width?: number };
type HlsErrorData = {
  fatal?: boolean;
  details?: string;
  reason?: string;
  response?: { code?: number; status?: number };
  networkDetails?: { status?: number };
  type?: string;
  error?: Error;
};
type HlsLike = Hls & {
  levels: HlsLevel[];
  currentLevel: number;
  subtitleTracks?: Array<{ lang?: string; name?: string; label?: string }>;
  subtitleTrack: number;
  on(event: string, listener: (event: string, data: unknown) => void): void;
};

const asRecord = (value: unknown): Record<string, unknown> => (typeof value === 'object' && value !== null ? value as Record<string, unknown> : {});
const statusFrom = (data: HlsErrorData): number | undefined => data.response?.status ?? data.response?.code ?? data.networkDetails?.status;

class HlsEngine extends NativeMediaEngine {
  readonly id = 'hls' as const;
  private hls: HlsLike | null = null;
  private levels: QualityLevel[] = [];
  private subtitleTracks: Array<{ language: string; label: string; index: number }> = [];
  private currentQuality = 'auto';

  get capabilities(): EngineCapabilities {
    const native = nativeCapabilitiesFor(this.video);
    return {
      ...hlsCapabilities,
      captions: Boolean((this.grant?.captions?.length ?? 0) > 0 || this.subtitleTracks.length > 0),
      pip: native.pip,
      fullscreen: native.fullscreen,
      seek: native.seek,
      airplay: native.airplay,
    };
  }

  protected sourceFor(grant: StreamGrant): string | undefined {
    return grant.masterUrl || grant.playUrl;
  }

  async attach(host: HTMLElement, grant: StreamGrant, options: { startAt: number; autoplay: boolean }): Promise<void> {
    this.ensureAlive();
    const video = this.createVideo(host, grant);
    const source = this.sourceFor(grant);
    if (!source) {
      this.emitError('unsupported', 'The HLS grant does not contain a master URL.', true, false);
      return;
    }
    const sdk = await import('hls.js');
    if (!this.isAttached(video)) return;
    const HlsClass = sdk.default;
    if (!HlsClass.isSupported()) {
      this.emitError('unsupported', 'This browser does not support HLS.js.', true, false);
      return;
    }
    this.hls = new HlsClass({ enableWorker: true, lowLatencyMode: false, maxBufferLength: 30 }) as HlsLike;
    const hls = this.hls;
    const events = (HlsClass as unknown as { Events?: Record<string, string> }).Events ?? {};
    const on = (name: string, listener: (event: string, data: unknown) => void) => hls.on(events[name] ?? name, listener);
    on('MANIFEST_PARSED', (_event, raw) => {
      const data = asRecord(raw);
      this.setLevels(Array.isArray(data.levels) ? data.levels as HlsLevel[] : hls.levels ?? []);
      this.finishAttach(options);
    });
    on('LEVEL_SWITCHED', (_event, raw) => {
      const index = Number(asRecord(raw).level);
      if (Number.isInteger(index) && this.levels[index]) {
        this.currentQuality = this.levels[index].id;
        this.emit({ type: 'qualities', levels: this.levels, current: this.currentQuality });
      }
    });
    on('SUBTITLE_TRACKS_UPDATED', (_event, raw) => this.setSubtitles(asRecord(raw).subtitleTracks));
    on('ERROR', (_event, raw) => this.handleHlsError(raw));
    hls.loadSource(source);
    hls.attachMedia(video);
  }

  private isAttached(video: HTMLVideoElement): boolean {
    return this.getVideoElement() === video;
  }

  private setLevels(levels: HlsLevel[]): void {
    this.levels = levels.map((level, index) => ({
      id: String(index),
      label: level.name || (level.height ? `${level.height}p` : `Level ${index + 1}`),
      height: level.height,
      bandwidthBps: level.bitrate,
    }));
    this.currentQuality = 'auto';
    this.emit({ type: 'qualities', levels: this.levels, current: this.currentQuality });
  }

  private setSubtitles(value: unknown): void {
    if (!Array.isArray(value)) return;
    this.subtitleTracks = value.map((track, index) => {
      const entry = asRecord(track);
      return {
        index,
        language: String(entry.lang ?? entry.language ?? ''),
        label: String(entry.name ?? entry.label ?? entry.lang ?? `Track ${index + 1}`),
      };
    }).filter((track) => track.language.length > 0);
    const grantTracks = this.grant?.captions ?? this.subtitleTracks.map((track) => ({ language: track.language, label: track.label, isDefault: false }));
    this.emit({ type: 'captions', tracks: grantTracks, current: null });
  }

  private handleHlsError(raw: unknown): void {
    const data = raw as HlsErrorData;
    const status = statusFrom(data);
    const detail = data.details || data.reason || data.error?.message || 'HLS playback failed.';
    const normalized = detail.toLowerCase();
    const tokenInvalid = status === 403 || normalized.includes('403') || normalized.includes('token_invalid');
    const rawBusy = status === 503 || normalized.includes('raw_busy');
    const fatal = data.fatal === true;
    const kind = tokenInvalid ? 'token_invalid' : rawBusy ? 'raw_busy' : fatal ? 'network' : 'network';
    const retryable = !tokenInvalid && (rawBusy || kind === 'network');
    this.emit({ type: 'error', kind, fatal, retryable, detail, ...(status === undefined ? {} : { status }) });
    if (!fatal || !this.hls) return;
    if (data.type === 'networkError' && typeof this.hls.startLoad === 'function') this.hls.startLoad();
    if (data.type === 'mediaError' && typeof this.hls.recoverMediaError === 'function') this.hls.recoverMediaError();
  }

  setQuality(id: string | 'auto'): void {
    if (!this.hls) return;
    if (id === 'auto') {
      this.hls.currentLevel = -1;
      this.currentQuality = 'auto';
    } else {
      const index = this.levels.findIndex((level) => level.id === id);
      if (index < 0) return;
      this.hls.currentLevel = index;
      this.currentQuality = id;
    }
    this.emit({ type: 'qualities', levels: this.levels, current: this.currentQuality });
  }

  setCaptions(language: string | null): void {
    if (this.hls && language !== null) {
      const index = this.subtitleTracks.findIndex((track) => track.language === language);
      if (index >= 0) this.hls.subtitleTrack = index;
    } else if (this.hls) {
      this.hls.subtitleTrack = -1;
    }
    super.setCaptions(language);
  }

  protected cleanupAttachment(): void {
    const hls = this.hls;
    this.hls = null;
    if (hls) hls.destroy();
    this.levels = [];
    this.subtitleTracks = [];
    super.cleanupAttachment();
  }
}

export const createEngine = () => new HlsEngine();
export const engineModule = { createEngine };
export default engineModule;
