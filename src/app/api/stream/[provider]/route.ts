import { NextResponse } from 'next/server';

// ============================================================
// Provider Extraction Strategies
// ============================================================
//
// Strategy A (Primary): Fetch embed page HTML → extract proxy URL from JS → call proxy → return M3U8
// Strategy B (Fallback): Fetch embed page → parse for direct <source> or video URL patterns
// Strategy C (Direct): If provider exposes a known API endpoint, call it directly
//
// Each provider defines its own extraction function that returns the stream URL(s).
// ============================================================

interface StreamResult {
  url: string | null;
  streams: string[];
  embedUrl: string;
  provider: string;
}

interface ProviderConfig {
  embedUrl: (id: string, type: string, season?: string, episode?: string) => string;
  extract: (html: string, embedUrl: string) => Promise<string[]>;
  headers?: Record<string, string>;
}

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------- VidCore Extraction ----------
// VidCore loads JS that builds a call to /api/proxy?url=<encoded>&headers=<encoded>
// The proxy returns the actual M3U8 stream.
async function extractVidCore(html: string, embedUrl: string): Promise<string[]> {
  const found: string[] = [];

  // Pattern 1: Look for /api/proxy?url=... in the HTML or inline JS
  const proxyRegex = /\/api\/proxy\?url=([^"'\s&]+)(?:&headers=([^"'\s&]+))?/g;
  let match: RegExpExecArray | null;
  while ((match = proxyRegex.exec(html)) !== null) {
    const proxyPath = match[0];
    const proxyUrl = `https://www.vidcore.org${proxyPath.startsWith('/') ? proxyPath : '/' + proxyPath}`;
    found.push(proxyUrl);
  }

  // Pattern 2: Look for full proxy URLs
  const fullProxyRegex = /https?:\/\/[^"'\s]+vidcore[^"'\s]*\/api\/proxy\?url=[^"'\s]+/g;
  while ((match = fullProxyRegex.exec(html)) !== null) {
    if (!found.includes(match[0])) found.push(match[0]);
  }

  // Pattern 3: Look for direct .m3u8 URLs in the page
  const m3u8Regex = /https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/g;
  while ((match = m3u8Regex.exec(html)) !== null) {
    if (!found.includes(match[0])) found.push(match[0]);
  }

  return found;
}

// ---------- 2embed Extraction ----------
async function extract2Embed(html: string, embedUrl: string): Promise<string[]> {
  const found: string[] = [];

  // Pattern: Look for direct .m3u8 URLs
  const m3u8Regex = /https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/g;
  let match: RegExpExecArray | null;
  while ((match = m3u8Regex.exec(html)) !== null) {
    found.push(match[0]);
  }

  // Pattern: Look for video source tags
  const srcRegex = /src=["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
  while ((match = srcRegex.exec(html)) !== null) {
    const url = match[1];
    if (!found.includes(url)) found.push(url);
  }

  // Pattern: Look for iframe src that might contain the actual player
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
  while ((match = iframeRegex.exec(html)) !== null) {
    const src = match[1];
    if (src.includes('2embed') || src.includes('.m3u8') || src.includes('/embed/')) {
      if (!found.includes(src)) found.push(src);
    }
  }

  return found;
}

// ---------- VidSrc Extraction ----------
async function extractVidSrc(html: string, embedUrl: string): Promise<string[]> {
  const found: string[] = [];

  // Pattern: Look for direct .m3u8 URLs
  const m3u8Regex = /https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/g;
  let match: RegExpExecArray | null;
  while ((match = m3u8Regex.exec(html)) !== null) {
    found.push(match[0]);
  }

  // Pattern: Look for source URL in player config (common pattern: {file: "...", ...})
  // VidSrc often exposes stream URL in a config object
  const sourceRegex = /["'](?:file|src|url|link)["']\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
  while ((match = sourceRegex.exec(html)) !== null) {
    const url = match[1];
    if (!found.includes(url)) found.push(url);
  }

  // Pattern: Look for video element sources
  const videoSrcRegex = /<source[^>]+src=["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
  while ((match = videoSrcRegex.exec(html)) !== null) {
    const url = match[1];
    if (!found.includes(url)) found.push(url);
  }

  return found;
}

// ---------- VidFast Extraction ----------
async function extractVidFast(html: string, embedUrl: string): Promise<string[]> {
  const found: string[] = [];

  // Pattern: Look for direct .m3u8 URLs
  const m3u8Regex = /https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/g;
  let match: RegExpExecArray | null;
  while ((match = m3u8Regex.exec(html)) !== null) {
    found.push(match[0]);
  }

  // Pattern: Look for source config
  const srcRegex = /["'](?:src|file|url)["']\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
  while ((match = srcRegex.exec(html)) !== null) {
    const url = match[1];
    if (!found.includes(url)) found.push(url);
  }

  return found;
}

// ---------- VidEasy Extraction ----------
async function extractVidEasy(html: string, embedUrl: string): Promise<string[]> {
  const found: string[] = [];

  // Pattern: Look for direct .m3u8 URLs
  const m3u8Regex = /https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/g;
  let match: RegExpExecArray | null;
  while ((match = m3u8Regex.exec(html)) !== null) {
    found.push(match[0]);
  }

  // Pattern: Look for source elements
  const srcRegex = /src=["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
  while ((match = srcRegex.exec(html)) !== null) {
    const url = match[1];
    if (!found.includes(url)) found.push(url);
  }

  // Pattern: Look for player config data
  const dataSrcRegex = /data[-:](?:src|url|file)\s*=\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
  while ((match = dataSrcRegex.exec(html)) !== null) {
    const url = match[1];
    if (!found.includes(url)) found.push(url);
  }

  return found;
}

// Provider configurations
const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  vidcore: {
    embedUrl: (id, type, season, episode) =>
      type === 'movie'
        ? `https://vidcore.org/embed/movie/${id}`
        : `https://vidcore.org/embed/tv/${id}/${season ?? '1'}/${episode ?? '1'}`,
    extract: extractVidCore,
    headers: {
      ...COMMON_HEADERS,
      Referer: 'https://vidcore.org/',
      Origin: 'https://vidcore.org',
    },
  },
  '2embed': {
    embedUrl: (id, type, season, episode) =>
      type === 'movie'
        ? `https://www.2embed.cc/embed/${id}`
        : `https://www.2embed.cc/embedtv/${id}?s=${season ?? '1'}&e=${episode ?? '1'}`,
    extract: extract2Embed,
    headers: {
      ...COMMON_HEADERS,
      Referer: 'https://www.2embed.cc/',
      Origin: 'https://www.2embed.cc',
    },
  },
  vidsrc: {
    embedUrl: (id, type, season, episode) =>
      type === 'movie'
        ? `https://vidsrc-embed.ru/embed/movie/${id}`
        : `https://vidsrc-embed.ru/embed/tv/${id}/${season ?? '1'}/${episode ?? '1'}`,
    extract: extractVidSrc,
    headers: {
      ...COMMON_HEADERS,
      Referer: 'https://vidsrc-embed.ru/',
      Origin: 'https://vidsrc-embed.ru',
    },
  },
  vidfast: {
    embedUrl: (id, type, season, episode) =>
      type === 'movie'
        ? `https://vidfast.vc/movie/${id}?autoPlay=true`
        : `https://vidfast.vc/tv/${id}/${season ?? '1'}/${episode ?? '1'}?autoPlay=true`,
    extract: extractVidFast,
    headers: {
      ...COMMON_HEADERS,
      Referer: 'https://vidfast.vc/',
      Origin: 'https://vidfast.vc',
    },
  },
  videasy: {
    embedUrl: (id, type, season, episode) =>
      type === 'movie'
        ? `https://player.videasy.net/movie/${id}`
        : `https://player.videasy.net/tv/${id}/${season ?? '1'}/${episode ?? '1'}`,
    extract: extractVidEasy,
    headers: {
      ...COMMON_HEADERS,
      Referer: 'https://player.videasy.net/',
      Origin: 'https://player.videasy.net',
    },
  },
};

// Try to resolve a proxy URL to an actual M3U8 stream
async function resolveProxyUrl(proxyUrl: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(proxyUrl, {
      headers: {
        ...COMMON_HEADERS,
        Accept: 'application/vnd.apple.mpegurl, application/x-mpegurl, */*',
      },
    });

    if (!res.ok) return null;

    // Check if the response is a playlist (M3U8) or a redirect
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (text.startsWith('#EXTM3U') || contentType.includes('mpegurl') || contentType.includes('x-mpegurl')) {
      // This IS the M3U8 manifest — return the proxy URL itself
      // The manifest will be proxied through our server
      return proxyUrl;
    }

    // If it's a JSON response, check for a URL field
    try {
      const json = JSON.parse(text);
      if (json.url) return json.url;
      if (json.stream) return json.stream;
      if (Array.isArray(json.streams) && json.streams.length > 0) return json.streams[0];
    } catch {
      // Not JSON, continue
    }

    // If the text contains an M3U8 URL, extract it
    const m3u8Match = text.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/);
    if (m3u8Match) return m3u8Match[0];

    // If it looks like a redirect URL in the response
    const redirectMatch = text.match(/window\.location\s*=\s*["']([^"']+)["']/);
    if (redirectMatch) return redirectMatch[1];

    return null;
  } catch {
    return null;
  }
}

// Try to resolve proxy URLs from a list of found URLs
async function resolveStreams(foundUrls: string[]): Promise<{ url: string | null; streams: string[] }> {
  const resolved: string[] = [];

  for (const url of foundUrls) {
    if (url.includes('/api/proxy') || url.includes('/proxy')) {
      // This is a proxy URL — call it to get the actual stream
      const resolvedUrl = await resolveProxyUrl(url);
      if (resolvedUrl && !resolved.includes(resolvedUrl)) {
        resolved.push(resolvedUrl);
      }
    } else if (url.endsWith('.m3u8') || url.endsWith('.mp4')) {
      // Direct stream URL
      if (!resolved.includes(url)) {
        resolved.push(url);
      }
    }
  }

  return {
    url: resolved.length > 0 ? resolved[0] : null,
    streams: resolved,
  };
}

export async function GET(
  request: Request,
  { params }: { params: { provider: string } },
) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') ?? 'movie';
  const season = searchParams.get('season') ?? undefined;
  const episode = searchParams.get('episode') ?? undefined;

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const provider = params.provider.toLowerCase();
  const config = PROVIDER_CONFIGS[provider];

  if (!config) {
    return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  }

  const embedUrl = config.embedUrl(id, type, season, episode);

  try {
    // Step 1: Fetch the embed page HTML
    const pageRes = await fetchWithTimeout(embedUrl, {
      headers: {
        ...COMMON_HEADERS,
        ...(config.headers ?? {}),
      },
    });

    if (!pageRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch embed page: ${pageRes.status}`, embedUrl, provider },
        { status: 502 },
      );
    }

    const html = await pageRes.text();

    // Step 2: Extract potential stream URLs using the provider's strategy
    const foundUrls = await config.extract(html, embedUrl);

    if (foundUrls.length === 0) {
      // Step 3: Fallback — try to fetch any nested iframe pages
      const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
      let iframeMatch: RegExpExecArray | null;
      const iframeUrls: string[] = [];

      while ((iframeMatch = iframeRegex.exec(html)) !== null) {
        const src = iframeMatch[1];
        // Only follow same-origin or relative iframes
        if (!src.startsWith('http') || src.includes(provider)) {
          iframeUrls.push(src.startsWith('http') ? src : new URL(src, embedUrl).href);
        }
      }

      // Try each iframe for stream URLs
      for (const iframeUrl of iframeUrls.slice(0, 3)) {
        // Limit to 3 iframes to avoid abuse
        try {
          const iframeRes = await fetchWithTimeout(iframeUrl, {
            headers: { ...COMMON_HEADERS, Referer: embedUrl, Origin: new URL(embedUrl).origin },
          });
          if (iframeRes.ok) {
            const iframeHtml = await iframeRes.text();
            const nestedUrls = await config.extract(iframeHtml, iframeUrl);
            foundUrls.push(...nestedUrls);
          }
        } catch {
          // Skip iframe if it fails
        }
      }
    }

    // Step 4: Resolve any proxy URLs to actual streams
    const { url, streams } = await resolveStreams(foundUrls);

    // Step 5: Deduplicate
    const uniqueUrls = Array.from(new Set(streams));

    if (uniqueUrls.length === 0) {
      // Return the embed URL as a fallback — the client can render it as an iframe
      return NextResponse.json({
        error: 'No stream URL found',
        embedUrl,
        provider,
        fallbackEmbed: true,
      }, { status: 404 });
    }

    return NextResponse.json({
      provider,
      embedUrl,
      streams: uniqueUrls,
      url: url ?? uniqueUrls[0],
      resolved: foundUrls.some((u) => u.includes('/proxy') || u.includes('/api/')),
    });
  } catch (error) {
    console.error('Stream extraction failed:', error);
    return NextResponse.json({
      error: 'Failed to extract stream',
      embedUrl,
      provider,
      fallbackEmbed: true,
    }, { status: 500 });
  }
}