'use client';
import React from 'react';
import NativePlayer from '@/components/watch/native-player';
import Image from 'next/image';
import Link from 'next/link';
import { getYear } from '@/lib/utils';
import type { TvDetails, SeasonDetails } from '@/services/MovieService/tmdbDetails';

interface TvWatchClientProps {
  id: number;
  initialData: TvDetails | null;
  initialSeason: string;
  initialEpisode: string;
  mediaType?: 'tv' | 'anime';
}

export default function TvWatchClient({
  id,
  initialData,
  initialSeason,
  initialEpisode,
  mediaType = 'tv',
}: TvWatchClientProps) {
  const [season, setSeason] = React.useState(initialSeason);
  const [episode, setEpisode] = React.useState(initialEpisode);
  const [seasonData, setSeasonData] = React.useState<SeasonDetails | null>(null);
  const [showSeasonPicker, setShowSeasonPicker] = React.useState(false);
  const [showEpisodePicker, setShowEpisodePicker] = React.useState(false);

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

  const handleSeasonChange = (newSeason: string) => {
    setSeason(newSeason);
    setEpisode('1');
    setShowSeasonPicker(false);
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

  const currentEpisode = episodes.find((e) => String(e.episode_number) === episode);

  return (
    <div className="min-h-screen bg-background">
      {/* Player */}
      <div className="relative aspect-video w-full">
        <NativePlayer
          key={`${id}-s${season}-e${episode}`}
          mediaId={String(id)}
          mediaType={mediaType}
          season={mediaType === 'anime' ? undefined : season}
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
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                {initialData.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
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
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {initialData.overview}
                </p>
              )}

              {/* Season & Episode Picker Buttons */}
              <div className="mt-4 flex flex-wrap gap-3">
                {/* Season button */}
                <div className="relative">
                  <button
                    onClick={() => { setShowSeasonPicker(!showSeasonPicker); setShowEpisodePicker(false); }}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {currentSeason?.name ?? `Season ${season}`}
                  </button>

                  {showSeasonPicker && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowSeasonPicker(false)} />
                      <div className="absolute left-0 top-full z-40 mt-2 w-[500px] max-w-[90vw] rounded-xl border border-border bg-card shadow-2xl">
                        <div className="p-3">
                          <p className="mb-3 px-1 text-xs font-medium text-muted-foreground">Select Season</p>
                          <div className="flex gap-3 overflow-x-auto pb-2">
                            {seasons.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => handleSeasonChange(String(s.season_number))}
                                className={`group shrink-0 text-left transition ${
                                  String(s.season_number) === season ? 'ring-2 ring-primary rounded-lg' : ''
                                }`}
                              >
                                <div className="aspect-[2/3] w-24 overflow-hidden rounded-lg bg-muted">
                                  {s.poster_path ? (
                                    <Image
                                      src={`https://image.tmdb.org/t/p/w185${s.poster_path}`}
                                      alt={s.name}
                                      width={96}
                                      height={144}
                                      className="h-full w-full object-cover transition group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
                                      {s.name}
                                    </div>
                                  )}
                                </div>
                                <p className="mt-1 text-xs font-medium text-foreground">{s.name}</p>
                                <p className="text-[10px] text-muted-foreground">{s.episode_count} eps</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Episode button */}
                <div className="relative">
                  <button
                    onClick={() => { setShowEpisodePicker(!showEpisodePicker); setShowSeasonPicker(false); }}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Episode {episode}{currentEpisode ? ` - ${currentEpisode.name}` : ''}
                  </button>

                  {showEpisodePicker && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowEpisodePicker(false)} />
                      <div className="absolute left-0 top-full z-40 mt-2 w-[600px] max-w-[90vw] rounded-xl border border-border bg-card shadow-2xl">
                        <div className="p-3">
                          <p className="mb-3 px-1 text-xs font-medium text-muted-foreground">
                            {currentSeason?.name ?? `Season ${season}`} — Episodes
                          </p>
                          <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
                            {(episodes.length > 0 ? episodes : 
                              currentSeason ? Array.from({ length: currentSeason.episode_count }, (_, i) => ({
                                id: i + 1,
                                episode_number: i + 1,
                                name: `Episode ${i + 1}`,
                                still_path: null,
                                overview: '',
                                air_date: null,
                                season_number: parseInt(season),
                                vote_average: 0,
                                runtime: null,
                              })) : []
                            ).map((ep) => (
                              <button
                                key={ep.id}
                                onClick={() => { setEpisode(String(ep.episode_number)); setShowEpisodePicker(false); }}
                                className={`flex items-center gap-3 rounded-lg p-2 text-left transition ${
                                  String(ep.episode_number) === episode
                                    ? 'bg-primary/10 ring-1 ring-primary'
                                    : 'hover:bg-muted'
                                }`}
                              >
                                {/* Episode still */}
                                <div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-muted">
                                  {'still_path' in ep && ep.still_path ? (
                                    <Image
                                      src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                                      alt={ep.name}
                                      width={112}
                                      height={64}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-muted-foreground/50">
                                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-medium ${
                                    String(ep.episode_number) === episode ? 'text-foreground' : 'text-foreground'
                                  }`}>
                                    E{ep.episode_number} - {ep.name}
                                  </p>
                                  {'overview' in ep && ep.overview && (
                                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                      {ep.overview}
                                    </p>
                                  )}
                                </div>
                                {/* Active indicator */}
                                {String(ep.episode_number) === episode && (
                                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                                    Playing
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Current episode info */}
              {currentEpisode && (
                <div className="mt-4 rounded-lg bg-card p-4 border border-border">
                  <p className="text-sm font-medium text-foreground">
                    Now Playing: S{season} E{episode}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentEpisode.name}
                  </p>
                  {'overview' in currentEpisode && currentEpisode.overview && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80">
                      {currentEpisode.overview}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right: Cast */}
            {cast.length > 0 && (
              <div className="md:w-72">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Cast</h3>
                <div className="flex flex-wrap gap-4 md:flex-col">
                  {cast.map((person) => (
                    <Link
                      key={person.id}
                      href={`/people/${person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${person.id}`}
                      className="flex items-center gap-2 group"
                    >
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                        {person.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            {person.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs text-foreground group-hover:text-primary">
                          {person.name}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground/60">
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
              <h2 className="mb-4 text-lg font-bold text-foreground">More Like This</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {similar.map((s) => (
                  <Link
                    key={s.id}
                    href={`/tv-shows/${s.name?.toLowerCase().replace(/\s+/g, '-')}-${s.id}`}
                    className="group"
                  >
                    <div className="aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                      {s.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w342${s.poster_path}`}
                          alt={s.name ?? ''}
                          width={200}
                          height={300}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground/50">
                          No Poster
                        </div>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground group-hover:text-foreground">
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