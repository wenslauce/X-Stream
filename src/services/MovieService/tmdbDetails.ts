import { cache } from 'react';
import tmdbClient from '@/lib/apiClient';
import type { Show, ShowWithGenreAndVideo } from '@/types';

export type Season = {
  id: number;
  air_date: string | null;
  episode_count: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
};

export type Episode = {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  vote_average: number;
  runtime: number | null;
};

export type TvDetails = ShowWithGenreAndVideo & {
  seasons: Season[];
  number_of_seasons: number;
  number_of_episodes: number;
  created_by: { id: number; name: string; profile_path: string | null }[];
};

export type SeasonDetails = {
  id: number;
  air_date: string;
  episodes: Episode[];
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
};

export type CreditsResponse = {
  id: number;
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
  crew: {
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }[];
};

export type SimilarResponse = {
  page: number;
  results: Show[];
  total_pages: number;
  total_results: number;
};

export const getMovieDetails = cache(async (id: number) => {
  const { data } = await tmdbClient.get<ShowWithGenreAndVideo>(
    `/movie/${id}?append_to_response=videos,credits,recommendations,similar`,
  );
  return data;
});

export const getTvDetails = cache(async (id: number) => {
  const { data } = await tmdbClient.get<TvDetails>(
    `/tv/${id}?append_to_response=videos,credits,recommendations,similar`,
  );
  return data;
});

export const getTvSeasonDetails = cache(
  async (tvId: number, seasonNumber: number) => {
    const { data } = await tmdbClient.get<SeasonDetails>(
      `/tv/${tvId}/season/${seasonNumber}`,
    );
    return data;
  },
);

export const getSimilarMovies = cache(async (id: number, type: string) => {
  const { data } = await tmdbClient.get<SimilarResponse>(
    `/${type}/${id}/similar`,
  );
  return data;
});

export const getMovieCredits = cache(async (id: number) => {
  const { data } = await tmdbClient.get<CreditsResponse>(`/movie/${id}/credits`);
  return data;
});

export const getTvCredits = cache(async (id: number) => {
  const { data } = await tmdbClient.get<CreditsResponse>(`/tv/${id}/credits`);
  return data;
});