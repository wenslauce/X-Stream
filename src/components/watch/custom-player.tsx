'use client';
import React from 'react';
import { embedSources, STORAGE_KEY, DEFAULT_SOURCE } from '@/configs/embed-sources';

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
const LOAD_TIMEOUT_MS = 15000;

type WatchProgress = Record<string, { timestamp: number; duration: number; percentage: number }>;

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
  const [activeSource, setActiveSource] = React.useState<string>(DEFAULT_SOURCE);
  const [showProviderMenu, setShowProviderMenu] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration] = React.useState(0);
  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [iframeError, setIframeError] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);
  const [showSkipIntro, setShowSkipIntro] = React.useState(false);
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const providerMenuRef = React.useRef<HTMLDivElement>(null);

  // Restore preferred source
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && embedSources.some((s) => s.name === stored)) {
      setActiveSource(stored);
    }
  }, []);

  // Build URL
  const currentUrl = React.useMemo(() => {
    const source = embedSources.find((s) => s.name === activeSource) ?? embedSources[0];
    if (mediaType === 'movie') return source.getMovieUrl(mediaId);
    return source.getTvUrl(mediaId, season ?? '1', episode ?? '1');
  }, [mediaId, mediaType, season, episode, activeSource]);

  // Reset on URL change
  React.useEffect(() => {
    setIframeLoaded(false);
    setIframeError(false);
    setShowSkipIntro(false);
  }, [currentUrl]);

  // Iframe timeout -> auto switch provider
  React.useEffect(() => {
    if (iframeLoaded || iframeError) return;
    const timeout = setTimeout(() => {
      if (!iframeLoaded) {
        const currentIdx = embedSources.findIndex((s) => s.name === activeSource);
        const nextIdx = (currentIdx + 1) % embedSources.length;
        const nextSource = embedSources[nextIdx];
        if (nextSource && nextSource.name !== activeSource) {
          setActiveSource(nextSource.name);
          localStorage.setItem(STORAGE_KEY, nextSource.name);
          setIframeError(true);
        }
      }
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [iframeLoaded, iframeError, activeSource]);

  // Auto-hide controls
  const showControlsTemporarily = React.useCallback(() => {
    setShowControls(true);
    setShowProviderMenu(false);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Handle source change
  const handleSourceChange = (name: string) => {
    setActiveSource(name);
    localStorage.setItem(STORAGE_KEY, name);
    setShowProviderMenu(false);
    setIframeLoaded(false);
    setIframeError(false);
  };

  // Close provider menu on outside click
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (providerMenuRef.current && !providerMenuRef.current.contains(e.target as Node)) {
        setShowProviderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Progress tracking (visual only)
  React.useEffect(() => {
    if (!iframeLoaded || iframeError) return;
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 0.1, 100);
        showSkipIntroFn(next);
        if (next >= 90 && hasNextEpisode && onNextEpisode) {
          clearInterval(progressIntervalRef.current!);
          onNextEpisode();
        }
        return next;
      });
    }, 1000);
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [iframeLoaded, iframeError, hasNextEpisode, onNextEpisode]);

  const showSkipIntroFn = (pct: number) => {
    if (pct > 0 && pct < 15) setShowSkipIntro(true);
    else setShowSkipIntro(false);
  };

  const handleSkipIntro = () => {
    setProgress(15);
    setShowSkipIntro(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (pct: number) => {
    const totalSec = Math.floor((pct / 100) * 3600);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentSource = embedSources.find((s) => s.name === activeSource) ?? embedSources[0];
  const sourceIdx = embedSources.indexOf(currentSource);

  return (
    <div
      ref={containerRef}
      className="group relative h-full w-full overflow-hidden bg-black"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => { setShowControls(false); setShowProviderMenu(false); }}
    >
      {/* Iframe - always full */}
      <iframe
        ref={iframeRef}
        src={currentUrl}
        className="h-full w-full"
        style={{ border: 'none' }}
        allowFullScreen
        allow="autoplay; encrypted-media"
        referrerPolicy="no-referrer"
        onLoad={() => setIframeLoaded(true)}
      />

      {/* Gradient bottom fade (behind controls) */}
      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Loading spinner */}
      {!iframeLoaded && !iframeError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-neutral-700 border-t-white" />
          <p className="text-sm text-neutral-400">{currentSource.name} is loading...</p>
        </div>
      )}

      {/* Error / switching */}
      {iframeError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-neutral-700 border-t-white" />
          <p className="text-sm text-neutral-400">Switching to next provider...</p>
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

      {/* Title overlay (top-left) */}
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
          {title && (
            <span className="truncate text-sm font-medium text-white drop-shadow-lg">
              {title}
            </span>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div className="px-4 pb-2">
          <div className="group/progress relative h-1.5 cursor-pointer rounded-full bg-white/20 hover:h-2">
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
          {/* Left */}
          <div className="flex items-center gap-3">
            {/* Provider selector */}
            <div className="relative" ref={providerMenuRef}>
              <button
                onClick={() => setShowProviderMenu(!showProviderMenu)}
                className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/20"
              >
                <span className="flex h-2 w-2 rounded-full bg-green-400" />
                {currentSource.name}
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {showProviderMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-44 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950/95 backdrop-blur-xl shadow-2xl">
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
                        <span
                          className={`flex h-2 w-2 shrink-0 rounded-full ${
                            src.name === activeSource ? 'bg-green-400' : 'bg-neutral-600'
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{src.name}</p>
                          <p className="text-[10px] text-neutral-500">{src.domain}</p>
                        </div>
                        {i === 0 && (
                          <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">
                            DEFAULT
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Time */}
            <span className="text-xs text-neutral-400">{formatTime(progress)}</span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Next Episode (TV only) */}
            {mediaType === 'tv' && hasNextEpisode && (
              <button
                onClick={onNextEpisode}
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/20"
              >
                Next Episode
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="rounded-md p-1.5 text-white/70 transition hover:text-white"
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