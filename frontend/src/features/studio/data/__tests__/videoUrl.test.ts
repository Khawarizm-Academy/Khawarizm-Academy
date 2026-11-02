import { describe, expect, it } from 'vitest';
import vectors from '../../../../../../shared/lib/videoUrlVectors.json';
import { parseStudioVideoUrl } from '@/features/studio/data/videoUrl';

type UrlVectors = {
  valid: Array<{ url: string; provider: 'youtube' | 'vimeo' | 'external' }>;
  invalid: Array<{ url: string; reason: string }>;
};

const sharedVectors = vectors as UrlVectors;

describe('parseStudioVideoUrl shared vectors', () => {
  it.each(sharedVectors.valid)('accepts the valid $provider vector $url', ({ url, provider }) => {
    const parsed = parseStudioVideoUrl(url);
    expect(parsed).not.toBeNull();
    expect(parsed?.provider).toBe(provider);
    expect(parsed?.externalId).toBeTruthy();
    expect(parsed?.canonicalUrl).toMatch(/^https:\/\//);
  });

  it('normalizes YouTube URLs to the watch form and provides the safe thumbnail guess', () => {
    expect(parseStudioVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      externalId: 'dQw4w9WgXcQ',
      canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
    expect(parseStudioVideoUrl('https://youtu.be/dQw4w9WgXcQ')?.canonicalUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it.each(sharedVectors.invalid)('rejects the hostile vector ($reason): $url', ({ url }) => {
    expect(parseStudioVideoUrl(url)).toBeNull();
  });

  it.each([
    'https://vimeo.com.evil.example/123456',
    'https://player.vimeo.com.evil.example/video/123456',
    'https://player.vimeo.com/video/123456?h=abc&h=def',
    'https://player.vimeo.com/video/123456?dnt=0',
    'https://vimeo.com/123456/invalid hash',
  ])('rejects hostile Vimeo input: %s', (url) => {
    expect(parseStudioVideoUrl(url)).toBeNull();
  });

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&v=anotherid',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ%2F',
    'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1',
    'https://cdn.example.com/video.mp4#fragment',
    'https://user:password@cdn.example.com/video.mp4',
    'https://cdn.example.com/video.mp4:443',
    'https://192.168.1.10/video.mp4',
    'https://cdn.example.com/path//video.webm',
  ])('rejects hostile YouTube or HTTPS input: %s', (url) => {
    expect(parseStudioVideoUrl(url)).toBeNull();
  });
});
