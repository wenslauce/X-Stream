export interface EmbedSource {
  name: string;
  domain: string;
  getMovieUrl: (id: string) => string;
  getTvUrl: (id: string, season: string, episode: string) => string;
}

export const embedSources: EmbedSource[] = [
  {
    name: 'VidCore',
    domain: 'vidcore.org',
    getMovieUrl: (id) =>
      `https://vidcore.org/embed/movie/${id}?autoPlay=false`,
    getTvUrl: (id, season, episode) =>
      `https://vidcore.org/embed/tv/${id}/${season}/${episode}?autoPlay=false`,
  },
  {
    name: '2embed',
    domain: '2embed.cc',
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, season, episode) =>
      `https://www.2embed.cc/embedtv/${id}?s=${season}&e=${episode}`,
  },
  {
    name: 'VidSrc',
    domain: 'vsembed.ru',
    getMovieUrl: (id) => `https://vidsrc-embed.ru/embed/movie/${id}`,
    getTvUrl: (id, season, episode) =>
      `https://vidsrc-embed.ru/embed/tv/${id}/${season}/${episode}`,
  },
];

export const DEFAULT_SOURCE = 'VidCore';
export const STORAGE_KEY = 'preferred-embed-source';