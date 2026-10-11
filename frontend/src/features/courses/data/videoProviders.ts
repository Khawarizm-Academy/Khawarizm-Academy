/**
 * Video-provider abstraction.
 *
 * The player negotiates its available controls through a provider's `supports`
 * flags. Today every course ships the simulated `mock` provider; the youtube,
 * baisalkah and videocipher entries document the capability contract a real
 * adapter must implement (embed URL building, real playback events, PiP over a
 * `<video>` element) once those integrations land.
 */

export type VideoProviderId = 'mock' | 'youtube' | 'baisalkah' | 'videocipher';

export interface VideoProviderSupport {
  /** Playback-rate switching (speed menu). */
  speed: boolean;
  /** Quality switching (quality menu). */
  quality: boolean;
  /** On-screen captions toggle. */
  captions: boolean;
  /** Picture-in-Picture via a real <video> element. */
  pictureInPicture: boolean;
  /** Fullscreen on the stage container. */
  fullscreen: boolean;
  /** Positional seeking (scrub bar). */
  seek: boolean;
}

export interface VideoProvider {
  id: VideoProviderId;
  label: string;
  supports: VideoProviderSupport;
}

const ALL = {
  speed: true,
  quality: true,
  captions: true,
  fullscreen: true,
} as const;

export const VIDEO_PROVIDERS: Record<VideoProviderId, VideoProvider> = {
  mock: {
    id: 'mock',
    label: 'محاكاة',
    supports: { ...ALL, pictureInPicture: false, seek: true },
  },
  youtube: {
    id: 'youtube',
    label: 'يوتيوب',
    supports: { ...ALL, pictureInPicture: true, seek: true },
  },
  baisalkah: {
    id: 'baisalkah',
    label: 'بيسلكة',
    supports: { ...ALL, pictureInPicture: false, seek: true },
  },
  videocipher: {
    id: 'videocipher',
    label: 'VideoCipher',
    supports: { ...ALL, pictureInPicture: false, seek: false },
  },
};

export const DEFAULT_VIDEO_PROVIDER: VideoProviderId = 'mock';

/** Per-course provider choice; extend this map when wiring a real hosting layer. */
const PROVIDER_BY_COURSE: Partial<Record<string, VideoProviderId>> = {
  'course-1': 'mock',
  'course-2': 'mock',
  'course-3': 'mock',
  'course-4': 'mock',
  'course-5': 'mock',
  'course-6': 'mock',
};

/** Resolves the provider for a course, falling back to the default mock. */
export function videoProviderFor(slug: string): VideoProvider {
  const id = PROVIDER_BY_COURSE[slug] ?? DEFAULT_VIDEO_PROVIDER;
  return VIDEO_PROVIDERS[id] ?? VIDEO_PROVIDERS[DEFAULT_VIDEO_PROVIDER];
}