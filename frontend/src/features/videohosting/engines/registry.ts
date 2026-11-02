import type { StreamGrant } from '@/features/videohosting/types';
import type { EngineLoader } from './types';

export const ENGINE_FOR = {
  hls: 'hls',
  raw: 'file',
  external: 'file',
  youtube: 'youtube',
  vimeo: 'vimeo',
} as const;

export const ENGINE_LOADERS = {
  hls: async () => (await import('./hlsEngine')).engineModule,
  native: async () => (await import('./nativeHlsEngine')).engineModule,
  file: async () => (await import('./fileEngine')).engineModule,
  youtube: async () => (await import('./youtubeEngine')).engineModule,
  vimeo: async () => (await import('./vimeoEngine')).engineModule,
} as const satisfies Record<'hls' | 'native' | 'file' | 'youtube' | 'vimeo', EngineLoader>;

export const engineLoaders = ENGINE_LOADERS;

const supportsNativeHls = (): boolean => {
  if (typeof document === 'undefined') return false;
  const video = document.createElement('video');
  return Boolean(video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('application/x-mpegURL'));
};

/**
 * Resolve a loader without constructing an engine. This function is intentionally
 * side-effect free so React render paths can safely call it.
 */
export function resolveEngineLoader(grant: StreamGrant): EngineLoader | null {
  const mode = grant.mode;
  if (mode === 'hls') return ENGINE_LOADERS[supportsNativeHls() ? 'native' : ENGINE_FOR.hls];
  if (mode === 'raw') return ENGINE_LOADERS[ENGINE_FOR.raw];
  if (mode === 'external') return ENGINE_LOADERS[ENGINE_FOR.external];
  if (mode === 'embed') {
    const provider = grant.provider?.toLowerCase();
    if (provider === 'youtube') return ENGINE_LOADERS[ENGINE_FOR.youtube];
    if (provider === 'vimeo') return ENGINE_LOADERS[ENGINE_FOR.vimeo];
  }
  return null;
}

export const getEngineLoader = resolveEngineLoader;
