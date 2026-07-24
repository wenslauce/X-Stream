import Image from 'next/image';
import Link from 'next/link';
import { getYear } from '@/lib/utils';
import { getTvDetails } from '@/services/MovieService/tmdbDetails';
import type { TvDetails } from '@/services/MovieService/tmdbDetails';

export default async function AnimeDetail({ id }: { id: number }) {
  let show: TvDetails | null = null;
  try {
    show = await getTvDetails(id);
  } catch {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Anime not found
      </div>
    );
  }

  const cast = show?.credits?.cast?.slice(0, 10) ?? [];
  const similar = show?.similar?.results?.slice(0, 12) ?? [];
  const seasons = show?.seasons?.filter((s) => s.season_number > 0) ?? [];
  const trailer = show?.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube');

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[70vh] min-h-[500px] w-full">
        {show.backdrop_path && (
          <Image
            src={`https://image.tmdb.org/t/p/original${show.backdrop_path}`}
            alt=""
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-10">
              <div className="hidden shrink-0 md:block">
                <Image
                  src={
                    show.poster_path
                      ? `https://image.tmdb.org/t/p/w342${show.poster_path}`
                      : '/images/placeholder-poster.png'
                  }
                  alt={show.name ?? ''}
                  width={200}
                  height={300}
                  className="rounded-lg shadow-2xl"
                  priority
                />
              </div>

              <div className="flex max-w-2xl flex-col gap-3">
                <h1 className="text-3xl font-bold text-foreground md:text-5xl lg:text-6xl">
                  {show.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {show.first_air_date && (
                    <span className="text-muted-foreground">{getYear(show.first_air_date)}</span>
                  )}
                  {show.number_of_seasons && (
                    <span className="text-muted-foreground">{show.number_of_seasons} Seasons</span>
                  )}
                  {show.number_of_episodes && (
                    <span className="text-muted-foreground">{show.number_of_episodes} Episodes</span>
                  )}
                  {show.vote_average > 0 && (
                    <span className="rounded bg-purple-600/20 px-2 py-0.5 text-sm font-semibold text-purple-400">
                      {Math.round(show.vote_average * 10)}% Match
                    </span>
                  )}
                </div>

                {show.tagline && (
                  <p className="text-sm italic text-muted-foreground/70">{show.tagline}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {show.genres?.map((genre) => (
                    <span
                      key={genre.id}
                      className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {show.overview}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/watch/anime/${show.id}?s=1&e=1`}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-8 py-3 font-semibold text-white transition hover:bg-purple-500"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play
                  </Link>
                  {trailer && (
                    <a
                      href={`https://www.youtube.com/watch?v=${trailer.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-6 py-3 font-semibold text-foreground transition hover:bg-card"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                      </svg>
                      Trailer
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16">
        {seasons.length > 0 && (
          <section className="py-8">
            <h2 className="mb-4 text-xl font-bold text-foreground">Seasons</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {seasons.map((season) => (
                <Link
                  key={season.id}
                  href={`/watch/anime/${show.id}?s=${season.season_number}&e=1`}
                  className="group shrink-0"
                >
                  <div className="aspect-[2/3] w-32 overflow-hidden rounded-lg bg-muted">
                    {season.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${season.poster_path}`}
                        alt={season.name}
                        width={128}
                        height={192}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground/50">
                        {season.name}
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-foreground">{season.name}</p>
                  <p className="text-xs text-muted-foreground">{season.episode_count} Episodes</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {cast.length > 0 && (
          <section className="py-8">
            <h2 className="mb-4 text-xl font-bold text-foreground">Cast</h2>
            <div className="flex gap-6 overflow-x-auto pb-2">
              {cast.map((person) => (
                <Link
                  key={person.id}
                  href={`/people/${person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${person.id}`}
                  className="shrink-0 text-center group"
                >
                  <div className="mx-auto mb-2 h-16 w-16 overflow-hidden rounded-full bg-muted transition ring-2 ring-transparent group-hover:ring-ring">
                    {person.profile_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                        alt={person.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-lg text-muted-foreground">
                        {person.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="max-w-[80px] truncate text-xs text-muted-foreground group-hover:text-foreground">
                    {person.name}
                  </p>
                  <p className="max-w-[80px] truncate text-[10px] text-muted-foreground/60">
                    {person.character}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <section className="py-8">
            <h2 className="mb-4 text-xl font-bold text-foreground">More Like This</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {similar.map((s) => (
                <Link
                  key={s.id}
                  href={`/anime/${s.name?.toLowerCase().replace(/\s+/g, '-')}-${s.id}`}
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
                      <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground/50">
                        {s.name}
                      </div>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    {s.vote_average > 0 && (
                      <span className="text-xs font-semibold text-purple-400">
                        {Math.round(s.vote_average * 10)}%
                      </span>
                    )}
                    {s.first_air_date && (
                      <span className="text-xs text-muted-foreground">
                        {getYear(s.first_air_date)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground group-hover:text-foreground">
                    {s.name}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}