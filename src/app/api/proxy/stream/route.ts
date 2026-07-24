import { NextResponse } from 'next/server';

/**
 * M3U8 Stream Proxy
 *
 * Proxies M3U8 playlists and segments through our server to avoid CORS issues.
 * When the NativePlayer receives a stream URL from a third-party CDN,
 * it proxies it through this endpoint so the browser doesn't block it.
 *
 * Usage: /api/proxy/stream?url=https://cdn.example.com/master.m3u8
 */

const ALLOWED_EXTENSIONS = ['.m3u8', '.ts', '.vtt', '.aac', '.mp3', '.mp4', '.key'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for segments

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Security: only allow proxying to specific domains (CDN providers)
  try {
    const parsedUrl = new URL(url);
    const allowedDomains = [
      'vidcore.org',
      '2embed.cc',
      'vidsrc-embed.ru',
      'vidfast.vc',
      'player.videasy.net',
      'vsembed.ru',
      'movie.forestgump.space',
      'antilogarithm-atlas.site',
      'antilogarithm-atlas.shop',
      'antilogarithm-atlas.xyz',
      'cloudorchestranova.com',
      'moviebite.cc',
    ];

    const isAllowed = allowedDomains.some(
      (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain),
    );

    if (!isAllowed) {
      // For security, only proxy known CDN domains
      // If the URL is not from an allowed domain, return it directly (the browser may or may not allow it)
      return NextResponse.redirect(url);
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    // Determine the content type based on the file extension
    const extension = getExtension(url);
    const contentType = getContentType(extension);

    // Fetch the stream content
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0',
        Accept: '*/*',
        Referer: new URL(url).origin,
        Origin: new URL(url).origin,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${res.status}` },
        { status: 502 },
      );
    }

    // Check content length
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const buffer = await res.arrayBuffer();

    // If it's an M3U8 playlist, we need to rewrite relative URLs to absolute
    // so the browser can resolve them through our proxy
    if (extension === '.m3u8') {
      const text = new TextDecoder().decode(buffer);
      const rewritten = rewriteM3U8Urls(text, url);
      const encoded = new TextEncoder().encode(rewritten);

      return new NextResponse(encoded, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'no-cache',
          'Content-Disposition': 'inline',
        },
      });
    }

    // For segments (.ts, .vtt, etc.), just proxy the binary data
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
    }
    console.error('Stream proxy failed:', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

function getExtension(url: string): string {
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\.[a-z0-9]+(?:\?|$)/i);
    return match ? match[0].toLowerCase() : '';
  } catch {
    return '';
  }
}

function getContentType(extension: string): string {
  const types: Record<string, string> = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/mp2t',
    '.vtt': 'text/vtt',
    '.aac': 'audio/aac',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.key': 'application/octet-stream',
  };
  return types[extension] || 'application/octet-stream';
}

/**
 * Rewrite relative URLs in M3U8 playlists to absolute URLs proxied through our server.
 *
 * This is critical because:
 * 1. The browser needs to fetch segments through our proxy (CORS)
 * 2. Relative URLs in the manifest need to be resolved against the original CDN URL
 * 3. We proxy them so the browser doesn't get CORS errors
 */
function rewriteM3U8Urls(content: string, baseUrl: string): string {
  const base = new URL(baseUrl);
  const baseOrigin = base.origin;

  return content.split('\n').map((line) => {
    const trimmed = line.trim();

    // Skip empty lines, comments, and tags
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('<')) {
      return line;
    }

    // This is a URL line — resolve it and proxy it
    try {
      const resolvedUrl = new URL(trimmed, baseUrl).href;

      // Only proxy URLs from the same origin (CDN)
      if (resolvedUrl.startsWith(baseOrigin)) {
        return `/api/proxy/stream?url=${encodeURIComponent(resolvedUrl)}`;
      }

      // For external URLs, still proxy them if they're from allowed domains
      return `/api/proxy/stream?url=${encodeURIComponent(resolvedUrl)}`;
    } catch {
      return line;
    }
  }).join('\n');
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}