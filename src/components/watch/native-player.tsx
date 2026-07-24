'use client';
import React from 'react';
import { embedSources, STORAGE_KEY, DEFAULT_SOURCE } from '@/configs/embed-sources';

interface NativePlayerProps {
  mediaId: string;
  mediaType: 'movie' | 'tv' | 'anime';
  season?: string;
  episode?: string;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  title?: string;
}

export default function NativePlayer({
  mediaId,
  mediaType,
  season,
  episode,
  onNextEpisode,
  hasNextEpisode,
  title,
}: NativePlayerProps) {
  const [activeSource, setActiveSource] = React.useState(DEFAULT_SOURCE);
  const [showProviderMenu, setShowProviderMenu] = React.useState(false);
  const providerMenuRef = React.useRef<HTMLDivElement>(null);

  // Restore preferred source
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && embedSources.some((s) => s.name === stored)) {
      setActiveSource(stored);
    }
  }, []);

  // Build embed URL
  const currentUrl = React.useMemo(() => {
    const source = embedSources.find((s) => s.name === activeSource) ?? embedSources[0];
    if (mediaType === 'movie') return source.getMovieUrl(mediaId);
    if (mediaType === 'anime' && source.getAnimeUrl) {
      return source.getAnimeUrl(mediaId, episode ?? '1');
    }
    return source.getTvUrl(mediaId, season ?? '1', episode ?? '1');
  }, [mediaId, mediaType, season, episode, activeSource]);

  // Handle source change
  const handleSourceChange = (name: string) => {
    setActiveSource(name);
    localStorage.setItem(STORAGE_KEY, name);
    setShowProviderMenu(false);
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

  const currentSource = embedSources.find((s) => s.name === activeSource) ?? embedSources[0];

  return (
    <div className="relative h-full w-full bg-black">
      {/* Iframe — sandbox blocks popups natively */}
      <iframe
        src={currentUrl}
        className="h-full w-full"
        style={{ border: 'none' }}
        allowFullScreen
        allow="autoplay; encrypted-media"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
      />

      {/* Provider selector — positioned at top-right, above iframe */}
      <div className="absolute right-4 top-4 z-50" ref={providerMenuRef}>
        <button
          onClick={() => setShowProviderMenu(!showProviderMenu)}
          className="flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/80"
        >
          <span className="flex h-2 w-2 rounded-full bg-green-400" />
          {currentSource.name}
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showProviderMenu && (
          <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950/95 backdrop-blur-xl shadow-2xl">
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

      {/* Next Episode button — bottom-right */}
      {(mediaType === 'tv' || mediaType === 'anime') && hasNextEpisode && (
        <button
          onClick={onNextEpisode}
          className="absolute bottom-4 right-4 z-50 rounded-md bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-black/80"
        >
          Next Episode
        </button>
      )}
    </div>
  );
}