import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

const PROVIDER_CONFIGS: Record<string, { url: (id: string, type: string, season?: string, episode?: string) => string }> = {
  vidcore: {
    url: (id, type, season, episode) =>
      type === 'movie'
        ? `https://vidcore.org/embed/movie/${id}`
        : `https://vidcore.org/embed/tv/${id}/${season ?? '1'}/${episode ?? '1'}`,
  },
  '2embed': {
    url: (id, type, season, episode) =>
      type === 'movie'
        ? `https://www.2embed.cc/embed/${id}`
        : `https://www.2embed.cc/embedtv/${id}?s=${season ?? '1'}&e=${episode ?? '1'}`,
  },
  vidsrc: {
    url: (id, type, season, episode) =>
      type === 'movie'
        ? `https://vidsrc-embed.ru/embed/movie/${id}`
        : `https://vidsrc-embed.ru/embed/tv/${id}/${season ?? '1'}/${episode ?? '1'}`,
  },
  vidfast: {
    url: (id, type, season, episode) =>
      type === 'movie'
        ? `https://vidfast.vc/movie/${id}?autoPlay=true`
        : `https://vidfast.vc/tv/${id}/${season ?? '1'}/${episode ?? '1'}?autoPlay=true`,
  },
  videasy: {
    url: (id, type, season, episode) =>
      type === 'movie'
        ? `https://player.videasy.net/movie/${id}`
        : `https://player.videasy.net/tv/${id}/${season ?? '1'}/${episode ?? '1'}`,
  },
};

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

  const embedUrl = config.url(id, type, season, episode);

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    
    // Intercept network requests to capture .m3u8 URLs
    const streamUrls: string[] = [];
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('.m3u8') || url.includes('.mp4')) {
        streamUrls.push(url);
      }
      req.continue();
    });

    // Set a reasonable timeout
    await page.goto(embedUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait a bit for dynamic content to load
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Also try to extract from page content
    const pageContent = await page.content();
    
    // Look for common patterns
    const m3u8Matches = pageContent.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g);
    if (m3u8Matches) {
      streamUrls.push(...m3u8Matches);
    }

    // Look for source tags
    const sourceMatches = pageContent.match(/src=["']([^"']+\.m3u8[^"']*)["']/g);
    if (sourceMatches) {
      sourceMatches.forEach((m) => {
        const url = m.replace(/src=["']/, '').replace(/["']$/, '');
        if (!streamUrls.includes(url)) streamUrls.push(url);
      });
    }

    await browser.close();

    // Deduplicate
    const uniqueUrls = Array.from(new Set(streamUrls));

    if (uniqueUrls.length === 0) {
      return NextResponse.json({
        error: 'No stream URL found',
        embedUrl,
        provider,
      }, { status: 404 });
    }

    return NextResponse.json({
      provider,
      embedUrl,
      streams: uniqueUrls,
      // Return the first .m3u8 as primary
      url: uniqueUrls[0],
    });
  } catch (error) {
    console.error('Stream extraction failed:', error);
    return NextResponse.json({
      error: 'Failed to extract stream',
      embedUrl,
      provider,
    }, { status: 500 });
  }
}