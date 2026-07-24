/**
 * M3U8 Manifest Parser
 *
 * Parses HLS (HTTP Live Streaming) playlists to extract:
 * - Variant streams (different quality levels with resolution + bandwidth)
 * - Segment URLs (.ts files)
 * - Subtitle tracks (.vtt)
 * - Audio tracks (multi-language)
 * - Key/DRM information
 *
 * Works in both browser and server environments (no DOM dependency).
 */

export interface M3U8Variant {
  bandwidth: number;
  resolution?: { width: number; height: number };
  codecs?: string;
  frameRate?: number;
  audioGroup?: string;
  subtitleGroup?: string;
  url: string;
}

export interface M3U8Segment {
  duration: number;
  url: string;
  title?: string;
  key?: {
    method: string;
    uri?: string;
    iv?: string;
  };
  map?: {
    uri: string;
    byterange?: string;
  };
  discontinuity?: boolean;
  programDateTime?: string;
}

export interface M3U8MediaTrack {
  type: 'AUDIO' | 'SUBTITLES' | 'VIDEO' | 'CLOSED-CAPTIONS';
  groupId: string;
  name: string;
  language?: string;
  default: boolean;
  autoselect: boolean;
  forced: boolean;
  uri?: string;
  characteristics?: string;
  channels?: string;
}

export interface M3U8Key {
  method: string;
  uri?: string;
  iv?: string;
  keyformat?: string;
  keyformatversions?: string;
}

export interface M3U8Playlist {
  /** Whether this is a master playlist (has variants) or a media playlist (has segments) */
  isMaster: boolean;
  /** Master playlist: variant streams (different qualities) */
  variants: M3U8Variant[];
  /** Master playlist: alternative media tracks (audio, subtitles) */
  mediaTracks: M3U8MediaTrack[];
  /** Media playlist: list of segments */
  segments: M3U8Segment[];
  /** Media playlist: target duration per segment */
  targetDuration?: number;
  /** Media playlist: media sequence number */
  mediaSequence?: number;
  /** Whether the playlist is endless (live stream) */
  isLive: boolean;
  /** DRM / encryption key info */
  key?: M3U8Key;
  /** The raw playlist content */
  raw: string;
  /** Base URL for resolving relative URLs */
  baseUrl: string;
}

/**
 * Resolve a potentially relative URL against a base URL.
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * Parse an M3U8 playlist string into a structured object.
 *
 * @param content - The raw M3U8 playlist content
 * @param baseUrl - The base URL used to resolve relative URLs (optional, defaults to empty string)
 * @returns Parsed M3U8Playlist object
 */
export function parseM3U8(content: string, baseUrl: string = ''): M3U8Playlist {
  const lines = content.split(/\r?\n/);
  const variants: M3U8Variant[] = [];
  const mediaTracks: M3U8MediaTrack[] = [];
  const segments: M3U8Segment[] = [];
  let isMaster = false;
  let targetDuration: number | undefined;
  let mediaSequence: number | undefined;
  let isLive = false;
  let currentKey: M3U8Key | undefined;
  let currentMap: { uri: string; byterange?: string } | undefined;
  let currentDiscontinuity = false;
  let currentProgramDateTime: string | undefined;
  let currentVariantInfo: Partial<M3U8Variant> = {};
  let currentMediaTrack: Partial<M3U8MediaTrack> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTM3U')) {
      // Start of playlist — nothing to parse
      continue;
    }

    if (line.startsWith('#EXT-X-STREAM-INF')) {
      // Master playlist: variant stream info
      isMaster = true;
      const attrs = parseAttributes(line.replace('#EXT-X-STREAM-INF:', ''));
      currentVariantInfo = {
        bandwidth: parseInt(attrs['BANDWIDTH'] || '0', 10),
        resolution: attrs['RESOLUTION']
          ? parseResolution(attrs['RESOLUTION'])
          : undefined,
        codecs: attrs['CODECS'],
        frameRate: attrs['FRAME-RATE'] ? parseFloat(attrs['FRAME-RATE']) : undefined,
        audioGroup: attrs['AUDIO'],
        subtitleGroup: attrs['SUBTITLES'],
      };
      continue;
    }

    if (line.startsWith('#EXT-X-MEDIA')) {
      // Master playlist: alternative media (audio, subtitles)
      isMaster = true;
      const attrs = parseAttributes(line.replace('#EXT-X-MEDIA:', ''));
      currentMediaTrack = {
        type: (attrs['TYPE'] as M3U8MediaTrack['type']) || 'AUDIO',
        groupId: attrs['GROUP-ID'] || '',
        name: attrs['NAME'] || '',
        language: attrs['LANGUAGE'],
        default: attrs['DEFAULT'] === 'YES',
        autoselect: attrs['AUTOSELECT'] === 'YES',
        forced: attrs['FORCED'] === 'YES',
        uri: attrs['URI'],
        characteristics: attrs['CHARACTERISTICS'],
        channels: attrs['CHANNELS'],
      };
      continue;
    }

    if (line.startsWith('#EXT-X-TARGETDURATION')) {
      targetDuration = parseInt(line.split(':')[1], 10);
      continue;
    }

    if (line.startsWith('#EXT-X-MEDIA-SEQUENCE')) {
      mediaSequence = parseInt(line.split(':')[1], 10);
      continue;
    }

    if (line.startsWith('#EXT-X-KEY')) {
      const attrs = parseAttributes(line.replace('#EXT-X-KEY:', ''));
      currentKey = {
        method: attrs['METHOD'] || 'NONE',
        uri: attrs['URI'],
        iv: attrs['IV'],
        keyformat: attrs['KEYFORMAT'],
        keyformatversions: attrs['KEYFORMATVERSIONS'],
      };
      continue;
    }

    if (line.startsWith('#EXT-X-MAP')) {
      const attrs = parseAttributes(line.replace('#EXT-X-MAP:', ''));
      currentMap = {
        uri: attrs['URI'] || '',
        byterange: attrs['BYTERANGE'],
      };
      continue;
    }

    if (line.startsWith('#EXT-X-DISCONTINUITY')) {
      currentDiscontinuity = true;
      continue;
    }

    if (line.startsWith('#EXT-X-PROGRAM-DATE-TIME')) {
      currentProgramDateTime = line.split(':')[1]?.trim();
      continue;
    }

    if (line.startsWith('#EXT-X-ENDLIST')) {
      isLive = false;
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      // Media playlist: segment info
      const extinf = line.replace('#EXTINF:', '');
      const durationMatch = extinf.match(/^([\d.]+)/);
      const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;
      const title = extinf.includes(',') ? extinf.split(',').slice(1).join(',').trim() : undefined;

      // Next line should be the segment URL
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.startsWith('#')) {
        segments.push({
          duration,
          url: resolveUrl(nextLine, baseUrl),
          title,
          key: currentKey,
          map: currentMap,
          discontinuity: currentDiscontinuity,
          programDateTime: currentProgramDateTime,
        });
        // Reset per-segment flags
        currentDiscontinuity = false;
        currentProgramDateTime = undefined;
        i++; // Skip the URL line
      }
      continue;
    }

    // If we have a pending variant info and the current line is a URL
    if (Object.keys(currentVariantInfo).length > 0 && line && !line.startsWith('#')) {
      variants.push({
        ...currentVariantInfo as M3U8Variant,
        url: resolveUrl(line, baseUrl),
      });
      currentVariantInfo = {};
      continue;
    }

    // If we have a pending media track and the current line is a URL (or we just need to push it)
    if (currentMediaTrack.type && currentMediaTrack.groupId) {
      mediaTracks.push(currentMediaTrack as M3U8MediaTrack);
      currentMediaTrack = {};
      continue;
    }
  }

  // If no ENDLIST tag was found, it's a live stream
  if (!content.includes('#EXT-X-ENDLIST')) {
    isLive = true;
  }

  return {
    isMaster,
    variants,
    mediaTracks,
    segments,
    targetDuration,
    mediaSequence,
    isLive,
    key: currentKey,
    raw: content,
    baseUrl,
  };
}

/**
 * Parse M3U8 attribute list (key=value pairs).
 * Handles quoted strings and bare values.
 */
function parseAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([A-Z0-9-]+)\s*=\s*(?:"([^"]*)"|([^",\s]*))/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    attrs[match[1]] = match[2] !== undefined ? match[2] : (match[3] || '');
  }
  return attrs;
}

/**
 * Parse a resolution string like "1920x1080" into { width, height }.
 */
function parseResolution(res: string): { width: number; height: number } | undefined {
  const parts = res.split('x');
  if (parts.length === 2) {
    const w = parseInt(parts[0], 10);
    const h = parseInt(parts[1], 10);
    if (!isNaN(w) && !isNaN(h)) {
      return { width: w, height: h };
    }
  }
  return undefined;
}

/**
 * Fetch and parse an M3U8 playlist from a URL.
 * Works in both browser and server environments.
 *
 * @param url - The URL of the M3U8 playlist
 * @param options - Optional fetch options (headers, etc.)
 * @returns Parsed M3U8Playlist object
 */
export async function fetchAndParseM3U8(
  url: string,
  options?: RequestInit,
): Promise<M3U8Playlist> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Failed to fetch M3U8: ${res.status} ${res.statusText}`);
  }
  const content = await res.text();
  return parseM3U8(content, url);
}

/**
 * Get the best quality variant from a master playlist.
 * Prefers highest resolution, then highest bandwidth.
 *
 * @param playlist - Parsed M3U8 playlist
 * @param maxHeight - Maximum height to allow (e.g., 1080 for 1080p cap)
 * @returns The best matching variant, or null if no variants exist
 */
export function getBestVariant(
  playlist: M3U8Playlist,
  maxHeight?: number,
): M3U8Variant | null {
  if (!playlist.isMaster || playlist.variants.length === 0) {
    return null;
  }

  let best: M3U8Variant | null = null;

  for (const variant of playlist.variants) {
    if (maxHeight && variant.resolution && variant.resolution.height > maxHeight) {
      continue; // Skip variants above max height
    }

    if (!best) {
      best = variant;
      continue;
    }

    const bestHeight = best.resolution?.height ?? 0;
    const variantHeight = variant.resolution?.height ?? 0;

    if (variantHeight > bestHeight) {
      best = variant;
    } else if (variantHeight === bestHeight && variant.bandwidth > best.bandwidth) {
      best = variant;
    }
  }

  return best;
}

/**
 * Get subtitle tracks from a master playlist.
 *
 * @param playlist - Parsed M3U8 playlist
 * @returns Array of subtitle tracks
 */
export function getSubtitleTracks(playlist: M3U8Playlist): M3U8MediaTrack[] {
  return playlist.mediaTracks.filter((t) => t.type === 'SUBTITLES' && t.uri);
}

/**
 * Get audio tracks from a master playlist.
 *
 * @param playlist - Parsed M3U8 playlist
 * @returns Array of audio tracks
 */
export function getAudioTracks(playlist: M3U8Playlist): M3U8MediaTrack[] {
  return playlist.mediaTracks.filter((t) => t.type === 'AUDIO' && t.uri);
}

/**
 * Format a variant's resolution for display (e.g., "1080p", "720p").
 */
export function formatVariantLabel(variant: M3U8Variant): string {
  if (variant.resolution) {
    const height = variant.resolution.height;
    const suffix = height >= 2160 ? '4K' : height >= 1440 ? '2K' : `${height}p`;
    const mbps = (variant.bandwidth / 1000000).toFixed(1);
    return `${suffix} (${mbps} Mbps)`;
  }
  const mbps = (variant.bandwidth / 1000000).toFixed(1);
  return `${mbps} Mbps`;
}

export default parseM3U8;