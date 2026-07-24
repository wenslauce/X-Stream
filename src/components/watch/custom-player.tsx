'use client';
import React from 'react';
import { embedSources, STORAGE_KEY } from '@/configs/embed-sources';

interface CustomPlayerProps {
  mediaId: string;
  mediaType: 'movie' | 'tv';
  season?: string;
  episode?: string;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  title?: string;
}

const STORAGE_PROGRESS_KEY = 'watch-progress';
const LOAD_TIMEOUT_MS = 15000; // 15s timeout before trying next provider

type WatchProgress = {
  [key: string]: {
    timestamp: number;
    duration: number;
    percentage: number;
    source: string;
  };
};

function getProgressKey(mediaId: string, mediaType: string, season?: string, episode?: string): string {
  if (mediaType === 'movie') return `movie-${mediaId}`;
  return `tv-${mediaId}-s${season}-e${episode}`;
}

export default function CustomPlayer({
  mediaId,
  mediaType,
  season,
  episode,
  onNextEpisode,
  hasNextEpisode,
  title,
}: CustomPlayerProps) {
  const [currentSourceIndex, setCurrentSourceIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [iframeError, setIframeError] = React.useState(false);
  const [showSkipIntro, setShowSkipIntro] = React.useState(false);
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get preferred source from localStorage
  const preferredIdx = React.useMemo(() => {
    if (typeof window === 'undefined') return -1;
    const stored = localStorage.getItem(STORAGE_KEY);
    return embedSources.findIndex((s) => s.name === stored);
  }, []);

  // Build URL for current source
  const currentUrl = React.useMemo(() => {
    const idx = preferredIdx >= 0 ? preferredIdx : currentSourceIndex;
    const source = embedSources[idx] ?? embedSources[0];
    if (mediaType === 'movie') {
      return source.getMovieUrl(mediaId);
    }
    return source.getTvUrl(mediaId, season ?? '1', episode ?? '1');
  }, [mediaId, mediaType, season, episode, currentSourceIndex, preferredIdx]);

  // Reset state when URL changes
  React.useEffect(() => {
    setIframeLoaded(false);
    setIframeError(false);
    setShowSkipIntro(false);
    setProgress(0);
  }, [currentUrl]);

  // Load saved progress
  React.useEffect(() => {
    const key = getProgressKey(mediaId, mediaType, season, episode);
    try {
      const saved = localStorage.getItem(STORAGE_PROGRESS_KEY);
      if (saved) {
        const all: WatchProgress = JSON.parse(saved);
        const p = all[key];
        if (p && p.percentage > 5 && p.percentage < 95) {
          // We can't seek the iframe, but we show a "Resume" indicator
          setProgress(p.percentage);
          setDuration(p.duration);
        }
      }
    } catch {}
  }, [mediaId, mediaType, season, episode]);

  // Simulate progress tracking (since we can't read iframe time)
  React.useEffect(() => {
    if (!iframeLoaded || iframeError) return;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 0.1, 100);
        // Save progress periodically
        const key = getProgressKey(mediaId, mediaType, season, episode);
        try {
          const all: WatchProgress = JSON.parse(
            localStorage.getItem(STORAGE_PROGRESS_KEY) ?? '{}',
          );
          all[key] = {
            timestamp: Date.now(),
            duration: duration || 3600,
            percentage: next,
            source: currentUrl,
          };
          localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(all));
        } catch {}

        // Show skip intro button at 0-15%
        if (next > 0 && next < 15) {
          setShowSkipIntro(true);
        } else {
          setShowSkipIntro(false);
        }

        // Auto next episode at 90%
        if (next >= 90 && hasNextEpisode && onNextEpisode) {
          clearInterval(progressIntervalRef.current!);
          onNextEpisode();
        }

        return next;
      });
    }, 1000);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [iframeLoaded, iframeError, hasNextEpisode, onNextEpisode, mediaId, mediaType, season, episode, currentUrl, duration]);

  // Iframe load timeout → try next provider
  React.useEffect(() => {
    if (iframeLoaded || iframeError) return;
    const timeout = setTimeout(() => {
      if (!iframeLoaded) {
        setIframeError(true);
        // Try next source
        const nextIdx = (currentSourceIndex + 1) % embedSources.length;
        setCurrentSourceIndex(nextIdx);
      }
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [iframeLoaded, iframeError, currentSourceIndex]);

  // Auto-hide controls
  const showControlsTemporarily = React.useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying((p) => !p);
          break;
        case 'KeyM':
          setIsMuted((m) => !m);
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'ArrowRight':
          setProgress((p) => Math.min(p + 5, 100));
          break;
        case 'ArrowLeft':
          setProgress((p) => Math.max(p - 5, 0));
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

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

  const handleSkipIntro = () => {
    setProgress(15);
    setShowSkipIntro(false);
  };

  const formatTime = (pct: number) => {
    const totalSec = Math.floor((pct / 100) * (duration || 3600));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const sourceName = embedSources[preferredIdx >= 0 ? preferredIdx : currentSourceIndex]?.name ?? 'Loading...';

  return (
    <div
      ref={containerRef}
      className="group relative h-full w-full bg-black"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={currentUrl}
        className="h-full w-full"
        style={{
          border: 'none',
          pointerEvents: showControls ? 'none' : 'auto',
        }}
        allowFullScreen
        allow="autoplay; encrypted-media"
        referrerPolicy="no-referrer"
        onLoad={() => setIframeLoaded(true)}
        onError={() => setIframeError(true)}
      />

      {/* Loading overlay */}
      {!iframeLoaded && !iframeError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-700 border-t-white" />
            <p className="text-sm text-neutral-400">Loading {sourceName}...</p>
          </div>
        </div>
      )}

      {/* Error / switching provider */}
      {iframeError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-700 border-t-white" />
            <p className="text-sm text-neutral-400">
              Switching provider...
            </p>
          </div>
        </div>
      )}

      {/* Click to play/pause overlay */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => setIsPlaying((p) => !p)}
      />

      {/* Big play/pause icon */}
      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <svg className="ml-1 h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Skip Intro button */}
      {showSkipIntro && (
        <button
          onClick={handleSkipIntro}
          className="absolute right-4 top-4 z-20 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
        >
          Skip Intro ▶▶
        </button>
      )}

      {/* Custom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div className="px-4">
          <div className="relative h-1 cursor-pointer rounded-full bg-neutral-700 group/progress">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 transition group-hover/progress:opacity-100"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="text-white transition hover:text-neutral-300"
            >
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

            {/* Previous (TV only) */}
            {mediaType === 'tv' && hasNextEpisode && (
              <button
                onClick={onNextEpisode}
                className="text-white/60 transition hover:text-white"
                title="Next Episode"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            )}

            {/* Volume */}
            <button
              onClick={() => setIsMuted((m) => !m)}
              className="text-white/60 transition hover:text-white"
            >
              {isMuted ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            {/* Time */}
            <span className="text-xs text-neutral-400">
              {formatTime(progress)} / {formatTime(100)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Source indicator */}
            <span className="text-[10px] text-neutral-600">{sourceName}</span>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white/60 transition hover:text-white"
            >
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