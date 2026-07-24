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
      `https://vidcore.org/embed/movie/${id}?autoPlay=true`,
    getTvUrl: (id, season, episode) =>
      `https://vidcore.org/embed/tv/${id}/${season}/${episode}?autoPlay=true`,
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
    getMovieUrl: (id) => `https://vidsrc-embed.ru/embed/movie/${id}?autoplay=1`,
    getTvUrl: (id, season, episode) =>
      `https://vidsrc-embed.ru/embed/tv/${id}/${season}/${episode}?autoplay=1`,
  },
  {
    name: 'VidFast',
    domain: 'vidfast.vc',
    getMovieUrl: (id) =>
      `https://vidfast.vc/movie/${id}?autoPlay=true`,
    getTvUrl: (id, season, episode) =>
      `https://vidfast.vc/tv/${id}/${season}/${episode}?autoPlay=true`,
  },
  {
    name: 'VidEasy',
    domain: 'player.videasy.net',
    getMovieUrl: (id) =>
      `https://player.videasy.net/movie/${id}?autoplayNextEpisode=true`,
    getTvUrl: (id, season, episode) =>
      `https://player.videasy.net/tv/${id}/${season}/${episode}?autoplayNextEpisode=true`,
  },
];

export const DEFAULT_SOURCE = 'VidCore';
export const STORAGE_KEY = 'preferred-embed-source';