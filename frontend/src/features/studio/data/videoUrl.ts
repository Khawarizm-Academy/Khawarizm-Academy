export type ParsedStudioVideoUrl = {
  provider: 'youtube' | 'vimeo' | 'external';
  externalId: string;
  canonicalUrl: string;
  thumbnailUrl?: string;
};

const MAX_REFERENCE_LENGTH = 500;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
const YOUTU_BE_HOSTS = new Set(['youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com']);
const VIMEO_PLAYER_HOSTS = new Set(['player.vimeo.com']);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,20}$/;
const VIMEO_HASH = /^[A-Za-z0-9_-]{1,64}$/;
const EXTERNAL_SUFFIXES = ['.mp4', '.webm', '.m3u8'];

function splitHttps(value: string, hosts?: Set<string>): URL | null {
  if (!value || value.length > MAX_REFERENCE_LENGTH || ![...value].every((character) => character.charCodeAt(0) >= 0x20 && character.charCodeAt(0) <= 0x7e) || /[\s\\]/.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || !parsed.hostname) return null;
    if (parsed.host !== parsed.hostname.toLowerCase()) return null;
    if (!parsed.pathname.startsWith('/')) return null;
    if (hosts && !hosts.has(parsed.hostname.toLowerCase())) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseYouTube(value: string): ParsedStudioVideoUrl | null {
  const parsed = splitHttps(value);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host) && !YOUTU_BE_HOSTS.has(host)) return null;
  if (parsed.hash || parsed.search.includes('%')) return null;
  let id: string;
  if (YOUTU_BE_HOSTS.has(host)) {
    if (parsed.search || parsed.pathname.split('/').filter(Boolean).length !== 1) return null;
    id = parsed.pathname.split('/').filter(Boolean)[0] || '';
  } else if (parsed.pathname === '/watch') {
    const values = parsed.searchParams.getAll('v');
    if (values.length !== 1) return null;
    id = values[0];
  } else {
    if (parsed.search || parsed.pathname.split('/').filter(Boolean).length !== 2) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (!['embed', 'shorts'].includes(parts[0])) return null;
    id = parts[1];
  }
  if (!YOUTUBE_ID.test(id)) return null;
  return { provider: 'youtube', externalId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}`, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
}

function parseVimeo(value: string): ParsedStudioVideoUrl | null {
  const parsed = splitHttps(value);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase();
  if (!VIMEO_HOSTS.has(host) && !VIMEO_PLAYER_HOSTS.has(host)) return null;
  if (parsed.hash) return null;
  let id: string;
  let hash: string | undefined;
  if (VIMEO_PLAYER_HOSTS.has(host)) {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length !== 2 || parts[0] !== 'video') return null;
    id = parts[1];
    const keys = [...parsed.searchParams.keys()];
    if (keys.some((key) => !['h', 'dnt'].includes(key)) || keys.some((key) => keys.filter((item) => item === key).length > 1)) return null;
    if (parsed.searchParams.get('dnt') && parsed.searchParams.get('dnt') !== '1') return null;
    hash = parsed.searchParams.get('h') || undefined;
  } else {
    if (parsed.search) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 1 || parts.length > 2) return null;
    id = parts[0]; hash = parts[1];
  }
  if (!VIMEO_ID.test(id) || (hash && !VIMEO_HASH.test(hash))) return null;
  const externalId = hash ? `${id}/${hash}` : id;
  return { provider: 'vimeo', externalId, canonicalUrl: `https://vimeo.com/${externalId}` };
}

function isPublicHostname(hostname: string): boolean {
  if (!hostname || hostname.endsWith('.') || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.includes('xn--')) return false;
  if (!/^[A-Za-z0-9.-]+$/.test(hostname)) return false;
  if (hostname.split('.').some((label) => !label || label.startsWith('-') || label.endsWith('-'))) return false;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) return false;
  return true;
}

function parseExternal(value: string): ParsedStudioVideoUrl | null {
  const parsed = splitHttps(value);
  if (!parsed || parsed.hash || parsed.pathname.includes('//') || !isPublicHostname(parsed.hostname)) return null;
  if (!EXTERNAL_SUFFIXES.some((suffix) => parsed.pathname.toLowerCase().endsWith(suffix))) return null;
  const canonical = `https://${parsed.hostname.toLowerCase()}${parsed.pathname}${parsed.search}`;
  return { provider: 'external', externalId: canonical, canonicalUrl: canonical };
}

export function parseStudioVideoUrl(value: string): ParsedStudioVideoUrl | null {
  return parseYouTube(value) || parseVimeo(value) || parseExternal(value);
}

export const videoUrlError = 'الرابط يجب أن يكون HTTPS صالحًا من YouTube أو Vimeo أو ملفًا مباشرًا عامًا بصيغة MP4/WebM/M3U8.';
