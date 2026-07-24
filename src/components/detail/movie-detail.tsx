import Image from 'next/image';
import Link from 'next/link';
import { getYear } from '@/lib/utils';
import { getMovieDetails } from '@/services/MovieService/tmdbDetails';
import type { ShowWithGenreAndVideo } from '@/types';

export default async function MovieDetail({ id }: { id: number }) {
  let movie: ShowWithGenreAndVideo | null = null;
  try {
    movie = await getMovieDetails(id);
  } catch {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-neutral-400">
        Movie not found
      </div>
    );
  }

  const cast = movie?.credits?.cast?.slice(0, 10) ?? [];
  const similar = movie?.similar?.results?.slice(0, 12) ?? [];

  return (
    <div className="relative min-h-screen">
      {/* Backdrop */}
      {movie.backdrop_path && (
        <div className="absolute inset-0 -z-10">
          <Image
            src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
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
                movie.poster_path
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : '/images/placeholder-poster.png'
              }
              alt={movie.title ?? ''}
              width={300}
              height={450}
              className="rounded-lg shadow-2xl"
              priority
            />
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center gap-4">
            <h1 className="text-3xl font-bold md:text-5xl">
              {movie.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400">
              {movie.release_date && (
                <span>{getYear(movie.release_date)}</span>
              )}
              {movie.runtime && (
                <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
              )}
              {movie.vote_average > 0 && (
                <span className="rounded bg-green-600/20 px-2 py-0.5 text-green-400 font-semibold">
                  {Math.round(movie.vote_average * 10)}% Match
                </span>
              )}
            </div>

            {movie.tagline && (
              <p className="text-sm italic text-neutral-500">{movie.tagline}</p>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-2">
              {movie.genres?.map((genre) => (
                <span
                  key={genre.id}
                  className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            <p className="max-w-2xl text-sm leading-relaxed text-neutral-300 md:text-base">
              {movie.overview}
            </p>

            {/* Watch button */}
            <Link
              href={`/watch/movie/${movie.id}`}
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-8 py-3 font-semibold text-black transition hover:bg-neutral-200"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Now
            </Link>

            {/* Cast */}
            {cast.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-400">Cast</h3>
                <div className="flex flex-wrap gap-6">
              {cast.map((person) => (
                    <Link
                      key={person.id}
                      href={`/people/${person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${person.id}`}
                      className="text-center group"
                    >
                      <div className="mx-auto mb-1 h-12 w-12 overflow-hidden rounded-full bg-neutral-800 transition group-hover:ring-2 group-hover:ring-white">
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
                      <p className="text-xs text-neutral-400 group-hover:text-white">{person.name}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-4 text-xl font-bold">Similar Movies</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {similar.map((s) => (
                <Link
                  key={s.id}
                  href={`/movies/${s.title?.toLowerCase().replace(/\s+/g, '-')}-${s.id}`}
                  className="group"
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-800">
                    {s.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${s.poster_path}`}
                        alt={s.title ?? ''}
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
                    {s.title}
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