export interface EmbedSource {
  name: string;
  domain: string;
  getMovieUrl: (id: string) => string;
  getTvUrl: (id: string, season: string, episode: string) => string;
  getAnimeUrl?: (id: string, episode: string) => string;
}

export const embedSources: EmbedSource[] = [
  {
    name: 'VidCore',
    domain: 'vidcore.org',
    getMovieUrl: (id) =>
      `https://vidcore.org/embed/movie/${id}?autoPlay=true`,
    getTvUrl: (id, season, episode) =>
      `https://vidcore.org/embed/tv/${id}/${season}/${episode}?autoPlay=true`,
    getAnimeUrl: (id, episode) =>
      `https://vidcore.org/embed/anime/${id}/${episode}?autoPlay=true`,
  },
  {
    name: '2embed',
    domain: '2embed.cc',
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, season, episode) =>
      `https://www.2embed.cc/embedtv/${id}?s=${season}&e=${episode}`,
    getAnimeUrl: (id, episode) =>
      `https://www.2embed.cc/embedtv/${id}?s=1&e=${episode}`,
  },
  {
    name: 'VidSrc',
    domain: 'vsembed.ru',
    getMovieUrl: (id) => `https://vidsrc-embed.ru/embed/movie/${id}?autoplay=1`,
    getTvUrl: (id, season, episode) =>
      `https://vidsrc-embed.ru/embed/tv/${id}/${season}/${episode}?autoplay=1`,
    getAnimeUrl: (id, episode) =>
      `https://vidsrc-embed.ru/embed/tv/${id}/1/${episode}?autoplay=1`,
  },
  {
    name: 'VidFast',
    domain: 'vidfast.vc',
    getMovieUrl: (id) =>
      `https://vidfast.vc/movie/${id}?autoPlay=true`,
    getTvUrl: (id, season, episode) =>
      `https://vidfast.vc/tv/${id}/${season}/${episode}?autoPlay=true`,
    getAnimeUrl: (id, episode) =>
      `https://vidfast.vc/tv/${id}/1/${episode}?autoPlay=true`,
  },
  {
    name: 'VidEasy',
    domain: 'player.videasy.net',
    getMovieUrl: (id) =>
      `https://player.videasy.net/movie/${id}?autoplayNextEpisode=true`,
    getTvUrl: (id, season, episode) =>
      `https://player.videasy.net/tv/${id}/${season}/${episode}?autoplayNextEpisode=true`,
    getAnimeUrl: (id, episode) =>
      `https://player.videasy.net/tv/${id}/1/${episode}?autoplayNextEpisode=true`,
  },
  {
    name: 'VidKing',
    domain: 'vidking.net',
    getMovieUrl: (id) =>
      `https://www.vidking.net/embed/movie/${id}?color=e50914&autoPlay=true`,
    getTvUrl: (id, season, episode) =>
      `https://www.vidking.net/embed/tv/${id}/${season}/${episode}?color=e50914&autoPlay=true&nextEpisode=true&episodeSelector=true`,
    getAnimeUrl: (id, episode) =>
      `https://www.vidking.net/embed/tv/${id}/1/${episode}?color=e50914&autoPlay=true&nextEpisode=true&episodeSelector=true`,
  },
  {
    name: 'Rive',
    domain: 'rivestream.app',
    getMovieUrl: (id) =>
      `https://www.rivestream.app/embed?type=movie&id=${id}`,
    getTvUrl: (id, season, episode) =>
      `https://www.rivestream.app/embed?type=tv&id=${id}&season=${season}&episode=${episode}`,
    getAnimeUrl: (id, episode) =>
      `https://www.rivestream.app/embed?type=tv&id=${id}&season=1&episode=${episode}`,
  },
];

export const DEFAULT_SOURCE = 'VidCore';
export const STORAGE_KEY = 'preferred-embed-source';