'use client';
import React from 'react';
import {
  embedSources,
  DEFAULT_SOURCE,
  STORAGE_KEY,
  type EmbedSource,
} from '@/configs/embed-sources';

interface EmbedPlayerProps {
  mediaId: string;
  mediaType: 'movie' | 'tv';
  season?: string;
  episode?: string;
}

function getInitialSource(): EmbedSource {
  if (typeof window === 'undefined') {
    return embedSources.find((s) => s.name === DEFAULT_SOURCE) ?? embedSources[0];
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  const found = embedSources.find((s) => s.name === stored);
  return found ?? embedSources.find((s) => s.name === DEFAULT_SOURCE) ?? embedSources[0];
}

function EmbedPlayer({ mediaId, mediaType, season, episode }: EmbedPlayerProps) {
  const [source, setSource] = React.useState<EmbedSource>(getInitialSource);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const buildUrl = React.useCallback(
    (src: EmbedSource) => {
      if (mediaType === 'movie') {
        return src.getMovieUrl(mediaId);
      }
      return src.getTvUrl(mediaId, season ?? '1', episode ?? '1');
    },
    [mediaId, mediaType, season, episode],
  );

  const [url, setUrl] = React.useState<string>('');

  React.useEffect(() => {
    setUrl(buildUrl(source));
  }, [source, buildUrl]);

  // Silently block all popup attempts from embedded players
  React.useEffect(() => {
    const originalOpen = window.open.bind(window);
    window.open = () => {
      // Silently return null — the embed player never knows it was blocked
      return null;
    };

    return () => {
      window.open = originalOpen;
    };
  }, []);

  const handleSourceChange = (newSource: EmbedSource) => {
    setSource(newSource);
    localStorage.setItem(STORAGE_KEY, newSource.name);
  };

  const handleIframeLoaded = () => {
    if (iframeRef.current) {
      iframeRef.current.style.opacity = '1';
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#000',
      }}>
      <div
        style={{
          width: '100%',
          flex: 1,
          position: 'relative',
        }}>
        <iframe
          ref={iframeRef}
          src={url}
          width="100%"
          height="100%"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            border: 'none',
            opacity: url ? 0 : 1,
          }}
          referrerPolicy="no-referrer"
          onLoad={handleIframeLoaded}
        />
      </div>

      {/* Source selector bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: '#111',
          borderTop: '1px solid #222',
        }}>
        <span
          style={{
            color: '#888',
            fontSize: '14px',
            marginRight: '8px',
          }}>
          Source:
        </span>
        {embedSources.map((src) => (
          <button
            key={src.name}
            onClick={() => handleSourceChange(src)}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: source.name === src.name ? '#3b82f6' : '#333',
              backgroundColor:
                source.name === src.name ? '#1e3a5f' : 'transparent',
              color: source.name === src.name ? '#fff' : '#aaa',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: source.name === src.name ? 600 : 400,
              transition: 'all 0.15s ease',
            }}>
            {src.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EmbedPlayer;