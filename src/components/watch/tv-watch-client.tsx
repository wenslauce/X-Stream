'use client';
import React from 'react';
import CustomPlayer from '@/components/watch/custom-player';
import Image from 'next/image';
import Link from 'next/link';
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
  const cast = initialData?.credits?.cast?.slice(0, 8) ?? [];
  const similar = initialData?.similar?.results?.slice(0, 6) ?? [];

  React.useEffect(() => {
    async function fetchSeason() {
      try {
        const res = await fetch(`/api/tmdb/tv/${id}/season/${season}`);
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

  // Reset episode to 1 synchronously when season changes
  const handleSeasonChange = (newSeason: string) => {
    setSeason(newSeason);
    setEpisode('1');
  };

  const handleNextEpisode = React.useCallback(() => {
    const nextEp = parseInt(episode) + 1;
    const maxEp = currentSeason?.episode_count ?? nextEp;
    if (nextEp <= maxEp) {
      setEpisode(String(nextEp));
    } else {
      const nextSeasonIdx = seasons.findIndex(
        (s) => s.season_number === parseInt(season),
      );
      if (nextSeasonIdx >= 0 && nextSeasonIdx < seasons.length - 1) {
        const nextSeason = seasons[nextSeasonIdx + 1];
        setSeason(String(nextSeason.season_number));
        setEpisode('1');
      }
    }
  }, [episode, season, seasons, currentSeason]);

  return (
    <div className="min-h-screen bg-black">
      {/* Player - key forces remount on season/episode change */}
      <div className="relative aspect-video w-full">
        <CustomPlayer
          key={`${id}-s${season}-e${episode}`}
          mediaId={String(id)}
          mediaType="tv"
          season={season}
          episode={episode}
          title={initialData?.name ?? undefined}
          hasNextEpisode={true}
          onNextEpisode={handleNextEpisode}
        />
      </div>

      {/* Content below player */}
      {initialData && (
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-6 md:flex-row">
            {/* Left: Info + Selectors */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                {initialData.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-400">
                {initialData.first_air_date && (
                  <span>{getYear(initialData.first_air_date)}</span>
                )}
                {initialData.number_of_seasons && (
                  <span>{initialData.number_of_seasons} Seasons</span>
                )}
                {initialData.number_of_episodes && (
                  <span>{initialData.number_of_episodes} Episodes</span>
                )}
                {initialData.vote_average > 0 && (
                  <span className="font-semibold text-green-400">
                    {Math.round(initialData.vote_average * 10)}% Match
                  </span>
                )}
              </div>

              {initialData.overview && (
                <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                  {initialData.overview}
                </p>
              )}

              {/* Season & Episode Selectors */}
              <div className="mt-4 flex flex-wrap gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Season
                  </label>
                  <select
                    value={season}
                    onChange={(e) => handleSeasonChange(e.target.value)}
                    className="w-48 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {seasons.map((s) => (
                      <option key={s.id} value={s.season_number}>
                        {s.name} ({s.episode_count} episodes)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Episode
                  </label>
                  <select
                    value={episode}
                    onChange={(e) => setEpisode(e.target.value)}
                    className="w-64 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              </div>

              {/* Current episode info */}
              {seasonData && (
                <div className="mt-4 rounded-lg bg-neutral-900 p-3">
                  <p className="text-sm font-medium text-white">
                    Now Playing: S{season} E{episode}
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

            {/* Right: Cast */}
            {cast.length > 0 && (
              <div className="md:w-72">
                <h3 className="mb-3 text-sm font-semibold text-neutral-400">Cast</h3>
                <div className="flex flex-wrap gap-4 md:flex-col">
                  {cast.map((person) => (
                    <Link
                      key={person.id}
                      href={`/people/${person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${person.id}`}
                      className="flex items-center gap-2 group"
                    >
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                        {person.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                            {person.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs text-neutral-300 group-hover:text-white">
                          {person.name}
                        </p>
                        <p className="truncate text-[10px] text-neutral-600">
                          {person.character}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Similar */}
          {similar.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-lg font-bold text-white">More Like This</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {similar.map((s) => (
                  <Link
                    key={s.id}
                    href={`/tv-shows/${s.name?.toLowerCase().replace(/\s+/g, '-')}-${s.id}`}
                    className="group"
                  >
                    <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-800">
                      {s.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w342${s.poster_path}`}
                          alt={s.name ?? ''}
                          width={200}
                          height={300}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-neutral-600">
                          No Poster
                        </div>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-neutral-400 group-hover:text-white">
                      {s.name}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}