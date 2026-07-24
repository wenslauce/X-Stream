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
    name: 'SuperEmbed',
    domain: 'multiembed.mov',
    getMovieUrl: (id) =>
      `https://multiembed.mov/directstream.php?video_id=${id}`,
    getTvUrl: (id, season, episode) =>
      `https://multiembed.mov/directstream.php?video_id=${id}&s=${season}&e=${episode}`,
    getAnimeUrl: (id, episode) =>
      `https://multiembed.mov/directstream.php?video_id=${id}&s=1&e=${episode}`,
  },
  {
    name: 'AutoEmbed',
    domain: 'autoembed.cc',
    getMovieUrl: (id) =>
      `https://autoembed.cc/embed/movie/${id}`,
    getTvUrl: (id, season, episode) =>
      `https://autoembed.cc/embed/tv/${id}/${season}/${episode}`,
    getAnimeUrl: (id, episode) =>
      `https://autoembed.cc/embed/tv/${id}/1/${episode}`,
  },
  {
    name: 'FBOX',
    domain: 'fboxtv.com',
    getMovieUrl: (id) =>
      `https://fboxtv.com/embed/movie/${id}`,
    getTvUrl: (id, season, episode) =>
      `https://fboxtv.com/embed/tv/${id}/${season}/${episode}`,
    getAnimeUrl: (id, episode) =>
      `https://fboxtv.com/embed/tv/${id}/1/${episode}`,
  },
  {
    name: 'MoviesAPI',
    domain: 'moviesapi.club',
    getMovieUrl: (id) =>
      `https://moviesapi.club/movie/${id}`,
    getTvUrl: (id, season, episode) =>
      `https://moviesapi.club/tv/${id}/${season}/${episode}`,
    getAnimeUrl: (id, episode) =>
      `https://moviesapi.club/tv/${id}/1/${episode}`,
  },
  {
    name: 'AjCDN',
    domain: 'ajcdn.bond',
    getMovieUrl: (id) =>
      `https://ajcdn.bond/embed/movie/${id}`,
    getTvUrl: (id, season, episode) =>
      `https://ajcdn.bond/embed/tv/${id}/${season}/${episode}`,
    getAnimeUrl: (id, episode) =>
      `https://ajcdn.bond/embed/tv/${id}/1/${episode}`,
  },
];

export const DEFAULT_SOURCE = 'VidCore';
export const STORAGE_KEY = 'preferred-embed-source';