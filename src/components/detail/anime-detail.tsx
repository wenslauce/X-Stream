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
      <div className="flex min-h-[50vh] items-center justify-center text-neutral-400">
        Anime not found
      </div>
    );
  }

  const cast = show?.credits?.cast?.slice(0, 10) ?? [];
  const similar = show?.similar?.results?.slice(0, 12) ?? [];
  const seasons = show?.seasons?.filter((s) => s.season_number > 0) ?? [];

  return (
    <div className="relative min-h-screen">
      {/* Backdrop */}
      {show.backdrop_path && (
        <div className="absolute inset-0 -z-10">
          <Image
            src={`https://image.tmdb.org/t/p/original${show.backdrop_path}`}
            alt=""
            fill
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 md:py-16">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Poster */}
          <div className="shrink-0">
            <Image
              src={
                show.poster_path
                  ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
                  : '/images/placeholder-poster.png'
              }
              alt={show.name ?? ''}
              width={300}
              height={450}
              className="rounded-lg shadow-2xl"
              priority
            />
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center gap-4">
            <h1 className="text-3xl font-bold md:text-5xl">
              {show.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400">
              {show.first_air_date && (
                <span>{getYear(show.first_air_date)}</span>
              )}
              {show.number_of_seasons && (
                <span>{show.number_of_seasons} Seasons</span>
              )}
              {show.number_of_episodes && (
                <span>{show.number_of_episodes} Episodes</span>
              )}
              {show.vote_average > 0 && (
                <span className="rounded bg-purple-600/20 px-2 py-0.5 text-purple-400 font-semibold">
                  {Math.round(show.vote_average * 10)}% Match
                </span>
              )}
            </div>

            {show.tagline && (
              <p className="text-sm italic text-neutral-500">{show.tagline}</p>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-2">
              {show.genres?.map((genre) => (
                <span
                  key={genre.id}
                  className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            <p className="max-w-2xl text-sm leading-relaxed text-neutral-300 md:text-base">
              {show.overview}
            </p>

            {/* Watch button */}
            <Link
              href={`/watch/anime/${show.id}?s=1&e=1`}
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-purple-600 px-8 py-3 font-semibold text-white transition hover:bg-purple-500"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Watching
            </Link>

            {/* Cast */}
            {cast.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-400">Cast</h3>
                <div className="flex flex-wrap gap-6">
                  {cast.map((person) => (
                    <div key={person.id} className="text-center">
                      <div className="mx-auto mb-1 h-12 w-12 overflow-hidden rounded-full bg-neutral-800">
                        {person.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                            {person.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400">{person.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seasons */}
        {seasons.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-4 text-xl font-bold">Seasons</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {seasons.map((season) => (
                <Link
                  key={season.id}
                  href={`/watch/anime/${show.id}?s=${season.season_number}&e=1`}
                  className="group"
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-800">
                    {season.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${season.poster_path}`}
                        alt={season.name}
                        width={200}
                        height={300}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-600">
                        No Poster
                      </div>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-white">
                    {season.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {season.episode_count} Episodes
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Similar */}
        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-4 text-xl font-bold">Similar Anime</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {similar.map((s) => (
                <Link
                  key={s.id}
                  href={`/anime/${s.name?.toLowerCase().replace(/\s+/g, '-')}-${s.id}`}
                  className="group"
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-800">
                    {s.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${s.poster_path}`}
                        alt={s.name ?? ''}
                        width={200}
                        height={300}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-600">
                        No Poster
                      </div>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-neutral-400 group-hover:text-white">
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