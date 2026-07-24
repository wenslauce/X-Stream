'use client';
import React from 'react';
import EmbedPlayer from '@/components/watch/embed-player';
import Image from 'next/image';
import { getYear } from '@/lib/utils';
import type { TvDetails, SeasonDetails } from '@/services/MovieService/tmdbDetails';

interface TvWatchClientProps {
  id: number;
  initialData: TvDetails | null;
  initialSeason: string;
  initialEpisode: string;
}

export default function TvWatchClient({
  id,
  initialData,
  initialSeason,
  initialEpisode,
}: TvWatchClientProps) {
  const [season, setSeason] = React.useState(initialSeason);
  const [episode, setEpisode] = React.useState(initialEpisode);
  const [seasonData, setSeasonData] = React.useState<SeasonDetails | null>(null);

  const seasons = initialData?.seasons?.filter((s) => s.season_number > 0) ?? [];
  const currentSeason = seasons.find((s) => String(s.season_number) === season);
  const episodes = seasonData?.episodes ?? [];

  React.useEffect(() => {
    async function fetchSeason() {
      try {
        const res = await fetch(
          `/api/tmdb/tv/${id}/season/${season}`,
        );
        if (res.ok) {
          const data: SeasonDetails = await res.json();
          setSeasonData(data);
        }
      } catch {
        // ignore
      }
    }
    fetchSeason();
  }, [id, season]);

  // Reset episode to 1 when season changes
  React.useEffect(() => {
    setEpisode('1');
  }, [season]);

  return (
    <div className="flex h-screen flex-col bg-black lg:flex-row">
      {/* Player */}
      <div className="relative flex-1">
        <EmbedPlayer
          mediaId={String(id)}
          mediaType="tv"
          season={season}
          episode={episode}
        />
      </div>

      {/* Sidebar */}
      {initialData && (
        <div className="w-full overflow-y-auto border-t border-neutral-800 bg-neutral-950 lg:w-96 lg:border-l lg:border-t-0">
          <div className="p-4">
            <div className="flex gap-3">
              {initialData.poster_path && (
                <Image
                  src={`https://image.tmdb.org/t/p/w92${initialData.poster_path}`}
                  alt={initialData.name ?? ''}
                  width={46}
                  height={69}
                  className="shrink-0 rounded"
                />
              )}
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-white">
                  {initialData.name}
                </h1>
                <p className="text-xs text-neutral-400">
                  {initialData.first_air_date && getYear(initialData.first_air_date)}
                  {initialData.number_of_seasons && ` • ${initialData.number_of_seasons} Seasons`}
                </p>
              </div>
            </div>

            {/* Season Selector */}
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                Season
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.season_number}>
                    {s.name} ({s.episode_count} episodes)
                  </option>
                ))}
              </select>
            </div>

            {/* Episode Selector */}
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                Episode
              </label>
              <select
                value={episode}
                onChange={(e) => setEpisode(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {episodes.length > 0
                  ? episodes.map((ep) => (
                      <option key={ep.id} value={ep.episode_number}>
                        E{ep.episode_number} - {ep.name}
                      </option>
                    ))
                  : currentSeason &&
                    Array.from(
                      { length: currentSeason.episode_count },
                      (_, i) => i + 1,
                    ).map((epNum) => (
                      <option key={epNum} value={epNum}>
                        Episode {epNum}
                      </option>
                    ))}
              </select>
            </div>

            {/* Current episode info */}
            {seasonData && (
              <div className="mt-4 rounded-lg bg-neutral-900 p-3">
                <p className="text-sm font-medium text-white">
                  S{season} E{episode}
                </p>
                {episodes.find((e) => String(e.episode_number) === episode)
                  ?.name && (
                  <p className="mt-1 text-sm text-neutral-400">
                    {
                      episodes.find(
                        (e) => String(e.episode_number) === episode,
                      )?.name
                    }
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}