'use client';
import React from 'react';
import Hls from 'hls.js';
import { embedSources, STORAGE_KEY, DEFAULT_SOURCE } from '@/configs/embed-sources';
import {
  parseM3U8,
  fetchAndParseM3U8,
  type M3U8Playlist,
  type M3U8Variant,
  type M3U8MediaTrack,
  formatVariantLabel,
} from '@/lib/m3u8-parser';

interface NativePlayerProps {
  mediaId: string;
  mediaType: 'movie' | 'tv' | 'anime';
  season?: string;
  episode?: string;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  title?: string;
}

const STORAGE_PROGRESS_KEY = 'watch-progress';

export default function NativePlayer({
  mediaId,
  mediaType,
  season,
  episode,
  onNextEpisode,
  hasNextEpisode,
  title,
}: NativePlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const hlsRef = React.useRef<Hls | null>(null);
  const [activeSource, setActiveSource] = React.useState(DEFAULT_SOURCE);
  const [showProviderMenu, setShowProviderMenu] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);
  const [streamUrl, setStreamUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showSkipIntro, setShowSkipIntro] = React.useState(false);
  const [useEmbedFallback, setUseEmbedFallback] = React.useState(false);
  const [isFromProxy, setIsFromProxy] = React.useState(false);
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const providerMenuRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // ---- Quality Selector State ----
  const [qualityMenuOpen, setQualityMenuOpen] = React.useState(false);
  const [availableQualities, setAvailableQualities] = React.useState<M3U8Variant[]>([]);
  const [activeQuality, setActiveQuality] = React.useState<string>('auto');

  // ---- Subtitle State ----
  const [subtitleTracks, setSubtitleTracks] = React.useState<M3U8MediaTrack[]>([]);
  const [activeSubtitle, setActiveSubtitle] = React.useState<string>('off');
  const [showSubtitleMenu, setShowSubtitleMenu] = React.useState(false);

  // Restore preferred source
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && embedSources.some((s) => s.name === stored)) {
      setActiveSource(stored);
    }
  }, []);

  // Fetch stream URL from our API
  const fetchStream = React.useCallback(async (sourceName: string) => {
    setIsLoading(true);
    setError(null);
    setStreamUrl(null);
    setAvailableQualities([]);
    setSubtitleTracks([]);
    setIsFromProxy(false);

    const providerKey = sourceName.toLowerCase();
    const params = new URLSearchParams({
      id: mediaId,
      type: mediaType === 'anime' ? 'tv' : mediaType,
    });
    if (season) params.set('season', season);
    if (episode) params.set('episode', episode);

    try {
      const res = await fetch(`/api/stream/${providerKey}?${params}`);
      const data = await res.json();
      if (data.url) {
        setStreamUrl(data.url);
        setIsFromProxy(data.resolved === true);

        // If the URL points to an M3U8 manifest, parse it for variants + subtitles
        if (data.url.endsWith('.m3u8')) {
          parseManifestForQualities(data.url).catch(() => {});
        }
      } else {
        setError(data.error ?? 'No stream URL found');
        if (data.fallbackEmbed) {
          setUseEmbedFallback(true);
        }
      }
    } catch {
      setError('Failed to fetch stream');
    } finally {
      setIsLoading(false);
    }
  }, [mediaId, mediaType, season, episode]);

  // Parse M3U8 manifest for quality levels and subtitle tracks
  const parseManifestForQualities = React.useCallback(async (url: string) => {
    try {
      const playlist = await fetchAndParseM3U8(url);

      if (playlist.isMaster && playlist.variants.length > 0) {
        setAvailableQualities(playlist.variants);
      }

      if (playlist.mediaTracks.length > 0) {
        const subs = playlist.mediaTracks.filter(
          (t) => t.type === 'SUBTITLES' && t.uri,
        );
        if (subs.length > 0) {
          setSubtitleTracks(subs);
        }
      }
    } catch {
      // Manifest parsing is best-effort; don't block playback
    }
  }, []);

  // Separately fetch M3U8 manifest for subtitle/quality info if the stream is from a proxy
  React.useEffect(() => {
    if (!streamUrl || !isFromProxy) return;
    if (streamUrl.endsWith('.m3u8')) {
      parseManifestForQualities(streamUrl).catch(() => {});
    }
  }, [streamUrl, isFromProxy, parseManifestForQualities]);

  // Fetch stream when source changes
  React.useEffect(() => {
    fetchStream(activeSource);
  }, [activeSource, fetchStream]);

  // Build a proxy URL for our server to avoid CORS when using the provider's proxy
  const getProxiedStreamUrl = React.useCallback((url: string): string => {
    // If it's already from our API, use it directly
    if (url.startsWith('/api/') || url.startsWith(location.origin)) {
      return url;
    }
    // Otherwise proxy it through our server to avoid CORS
    return `/api/proxy/stream?url=${encodeURIComponent(url)}`;
  }, []);

  // Initialize HLS when stream URL is available
  React.useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const playbackUrl = getProxiedStreamUrl(streamUrl);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });

      // Attach quality level change handler
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Populate qualities from HLS.js if we couldn't parse the manifest ourselves
        if (availableQualities.length === 0 && hls.levels.length > 0) {
          const variants: M3U8Variant[] = hls.levels.map((level, i) => ({
            bandwidth: level.bitrate,
            resolution: level.width && level.height
              ? { width: level.width, height: level.height }
              : undefined,
            url: `${i}`, // Index-based reference for HLS.js level switching
          }));
          setAvailableQualities(variants);
        }

        videoRef.current?.play().catch(() => {});
        setIsPlaying(true);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        if (level) {
          const height = level.height;
          const label = height ? `${height}p` : `${(level.bitrate / 1000000).toFixed(1)} Mbps`;
          setActiveQuality(label);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError('Stream playback failed');
        }
      });

      hls.loadSource(playbackUrl);
      hls.attachMedia(videoRef.current);
      hlsRef.current = hls;

      // Expose HLS instance for quality switching
      (window as any).__hlsInstance = hls;
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoRef.current.src = playbackUrl;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      delete (window as any).__hlsInstance;
    };
  }, [streamUrl, getProxiedStreamUrl, availableQualities.length]);

  // Quality switching
  const handleQualityChange = React.useCallback((variant: M3U8Variant | null) => {
    const hls = (window as any).__hlsInstance as Hls | undefined;
    if (!hls) return;

    if (!variant) {
      // Switch to auto
      hls.currentLevel = -1;
      setActiveQuality('auto');
    } else {
      // Find the matching level index
      const idx = hls.levels.findIndex((l) => {
        return (
          l.bitrate === variant.bandwidth &&
          l.width === variant.resolution?.width &&
          l.height === variant.resolution?.height
        );
      });
      if (idx >= 0) {
        hls.currentLevel = idx;
        setActiveQuality(formatVariantLabel(variant));
      }
    }
    setQualityMenuOpen(false);
  }, []);

  // Subtitle switching
  const handleSubtitleChange = React.useCallback(async (track: M3U8MediaTrack | null) => {
    if (!videoRef.current) return;

    // Remove existing tracks
    const existingTracks = videoRef.current.textTracks;
    for (let i = existingTracks.length - 1; i >= 0; i--) {
      existingTracks[i].mode = 'disabled';
    }

    if (!track || !track.uri) {
      setActiveSubtitle('off');
      setShowSubtitleMenu(false);
      return;
    }

    setActiveSubtitle(track.name);
    setShowSubtitleMenu(false);

    // Fetch the VTT content and add it as a text track
    try {
      const res = await fetch(getProxiedStreamUrl(track.uri));
      if (!res.ok) return;
      const vttContent = await res.text();

      // Create a blob URL for the VTT content
      const blob = new Blob([vttContent], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);

      const trackEl = document.createElement('track');
      trackEl.kind = 'subtitles';
      trackEl.label = track.name;
      trackEl.srclang = track.language || 'en';
      trackEl.src = blobUrl;
      trackEl.default = track.default;

      videoRef.current.appendChild(trackEl);
      // Enable the new track
      const textTrack = videoRef.current.textTracks[videoRef.current.textTracks.length - 1];
      if (textTrack) {
        textTrack.mode = 'showing';
      }
    } catch {
      // Subtitle loading failed silently
    }
  }, [getProxiedStreamUrl]);

  // Time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const ct = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(ct);
    setDuration(dur);
    setProgress((ct / dur) * 100);

    // Save progress
    const key = mediaType === 'movie'
      ? `movie-${mediaId}`
      : mediaType === 'anime'
        ? `anime-${mediaId}-e${episode}`
        : `tv-${mediaId}-s${season}-e${episode}`;
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_PROGRESS_KEY) ?? '{}');
      all[key] = { timestamp: Date.now(), duration: dur, percentage: (ct / dur) * 100 };
      localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(all));
    } catch {}

    // Skip intro detection (first 2 minutes)
    if (ct > 0 && ct < 120 && dur > 1200) {
      setShowSkipIntro(true);
    } else {
      setShowSkipIntro(false);
    }

    // Auto next episode at 90%
    if (ct / dur >= 0.9 && hasNextEpisode && onNextEpisode) {
      onNextEpisode();
    }
  };

  const handleSkipIntro = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 120; // Skip to 2 minutes
      setShowSkipIntro(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      setIsMuted(v === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * videoRef.current.duration;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSourceChange = (name: string) => {
    setActiveSource(name);
    localStorage.setItem(STORAGE_KEY, name);
    setShowProviderMenu(false);
    setQualityMenuOpen(false);
    setShowSubtitleMenu(false);
    setUseEmbedFallback(false);
    setActiveQuality('auto');
    setActiveSubtitle('off');
  };

  // Auto-hide controls
  const showControlsTemporarily = React.useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showProviderMenu && !qualityMenuOpen && !showSubtitleMenu) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, showProviderMenu, qualityMenuOpen, showSubtitleMenu]);

  // Close menus on outside click
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (providerMenuRef.current && !providerMenuRef.current.contains(target)) {
        setShowProviderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'ArrowRight':
          if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, videoRef.current.duration);
          break;
        case 'ArrowLeft':
          if (videoRef.current) videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const currentSource = embedSources.find((s) => s.name === activeSource) ?? embedSources[0];

  // Build embed URL for fallback mode
  const getEmbedUrl = React.useCallback(() => {
    const source = embedSources.find((s) => s.name === activeSource) ?? embedSources[0];
    if (mediaType === 'movie') return source.getMovieUrl(mediaId);
    if (mediaType === 'anime' && source.getAnimeUrl) {
      return source.getAnimeUrl(mediaId, episode ?? '1');
    }
    return source.getTvUrl(mediaId, season ?? '1', episode ?? '1');
  }, [activeSource, mediaType, mediaId, season, episode]);

  return (
    <div
      ref={containerRef}
      className="group relative h-full w-full overflow-hidden bg-black"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => {
        if (!showProviderMenu && !qualityMenuOpen && !showSubtitleMenu) {
          setShowControls(false);
        }
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="h-full w-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (hasNextEpisode && onNextEpisode) onNextEpisode();
        }}
        onClick={togglePlay}
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      />

      {/* Gradient bottom fade */}
      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-neutral-700 border-t-white" />
          <p className="text-sm text-neutral-400">Loading {currentSource.name}...</p>
        </div>
      )}

      {/* Embed fallback iframe */}
      {useEmbedFallback && (
        <iframe
          ref={iframeRef}
          src={getEmbedUrl()}
          className="h-full w-full"
          style={{ border: 'none' }}
          allowFullScreen
          allow="autoplay; encrypted-media"
          referrerPolicy="no-referrer"
        />
      )}

      {/* Error */}
      {error && !isLoading && !useEmbedFallback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-red-400">{error}</p>
          <p className="text-xs text-neutral-500">Try switching to another provider</p>
          <button
            onClick={() => setUseEmbedFallback(true)}
            className="rounded-lg bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
          >
            Switch to Embed Mode
          </button>
        </div>
      )}

      {/* Big play button */}
      {!isPlaying && !isLoading && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="pointer-events-auto flex h-20 w-20 cursor-pointer items-center justify-center rounded-full bg-white/20 backdrop-blur transition hover:bg-white/30"
            onClick={togglePlay}
          >
            <svg className="ml-1 h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Skip Intro */}
      {showSkipIntro && (
        <button
          onClick={handleSkipIntro}
          className="absolute right-4 top-4 z-30 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
        >
          Skip Intro
        </button>
      )}

      {/* Title overlay */}
      <div
        className={`pointer-events-none absolute left-0 right-0 top-0 px-4 pt-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-3">
          {mediaType === 'tv' && (
            <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium text-neutral-300 backdrop-blur-sm">
              S{season} E{episode}
            </span>
          )}
          {mediaType === 'anime' && (
            <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium text-neutral-300 backdrop-blur-sm">
              EP {episode}
            </span>
          )}
          {title && (
            <span className="truncate text-sm font-medium text-white drop-shadow-lg">{title}</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div className="px-4 pb-2">
          <div
            className="group/progress relative h-1.5 cursor-pointer rounded-full bg-white/20 hover:h-2"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full bg-white transition-all duration-150"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-lg opacity-0 transition group-hover/progress:opacity-100"
              style={{ left: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white transition hover:text-neutral-300">
              {isPlaying ? (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <button onClick={toggleMute} className="text-white/60 transition hover:text-white">
              {isMuted || volume === 0 ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            {/* Volume slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 accent-white"
            />

            {/* Time */}
            <span className="text-xs text-neutral-400">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Subtitle selector */}
            {subtitleTracks.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSubtitleMenu(!showSubtitleMenu);
                    setShowProviderMenu(false);
                    setQualityMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13V7a2 2 0 012-2h6a2 2 0 012 2v6M7 13l-3 3m3-3l3 3m0 0l3-3m-3 3V9" />
                  </svg>
                  {activeSubtitle === 'off' ? 'CC' : activeSubtitle}
                </button>

                {showSubtitleMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950/95 backdrop-blur-xl shadow-2xl">
                    <div className="p-1.5">
                      <button
                        onClick={() => handleSubtitleChange(null)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          activeSubtitle === 'off'
                            ? 'bg-white/10 text-white'
                            : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className={`flex h-2 w-2 shrink-0 rounded-full ${activeSubtitle === 'off' ? 'bg-green-400' : 'bg-neutral-600'}`} />
                        Off
                      </button>
                      {subtitleTracks.map((track) => (
                        <button
                          key={track.name + track.language}
                          onClick={() => handleSubtitleChange(track)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                            activeSubtitle === track.name
                              ? 'bg-white/10 text-white'
                              : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className={`flex h-2 w-2 shrink-0 rounded-full ${activeSubtitle === track.name ? 'bg-green-400' : 'bg-neutral-600'}`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{track.name}</p>
                            {track.language && (
                              <p className="text-[10px] text-neutral-500">{track.language}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quality selector */}
            {availableQualities.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setQualityMenuOpen(!qualityMenuOpen);
                    setShowProviderMenu(false);
                    setShowSubtitleMenu(false);
                  }}
                  className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  {activeQuality}
                </button>

                {qualityMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950/95 backdrop-blur-xl shadow-2xl">
                    <div className="p-1.5">
                      {/* Auto quality */}
                      <button
                        onClick={() => handleQualityChange(null)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          activeQuality === 'auto'
                            ? 'bg-white/10 text-white'
                            : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className={`flex h-2 w-2 shrink-0 rounded-full ${activeQuality === 'auto' ? 'bg-green-400' : 'bg-neutral-600'}`} />
                        Auto (Adaptive)
                      </button>

                      {/* Available qualities */}
                      {availableQualities.map((variant, i) => {
                        const label = formatVariantLabel(variant);
                        return (
                          <button
                            key={i}
                            onClick={() => handleQualityChange(variant)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                              activeQuality === label
                                ? 'bg-white/10 text-white'
                                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className={`flex h-2 w-2 shrink-0 rounded-full ${activeQuality === label ? 'bg-green-400' : 'bg-neutral-600'}`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{label}</p>
                              {variant.resolution && (
                                <p className="text-[10px] text-neutral-500">
                                  {variant.resolution.width}x{variant.resolution.height}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Provider selector */}
            <div className="relative" ref={providerMenuRef}>
              <button
                onClick={() => {
                  setShowProviderMenu(!showProviderMenu);
                  setQualityMenuOpen(false);
                  setShowSubtitleMenu(false);
                }}
                className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/20"
              >
                <span className="flex h-2 w-2 rounded-full bg-green-400" />
                {currentSource.name}
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProviderMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-44 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950/95 backdrop-blur-xl shadow-2xl">
                  <div className="p-1.5">
                    {embedSources.map((src, i) => (
                      <button
                        key={src.name}
                        onClick={() => handleSourceChange(src.name)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          src.name === activeSource
                            ? 'bg-white/10 text-white'
                            : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className={`flex h-2 w-2 shrink-0 rounded-full ${src.name === activeSource ? 'bg-green-400' : 'bg-neutral-600'}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{src.name}</p>
                          <p className="text-[10px] text-neutral-500">{src.domain}</p>
                        </div>
                        {i === 0 && <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">DEFAULT</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Next Episode */}
            {(mediaType === 'tv' || mediaType === 'anime') && hasNextEpisode && (
              <button
                onClick={onNextEpisode}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/20"
              >
                Next Episode
              </button>
            )}

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="rounded-md p-1.5 text-white/70 transition hover:text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}