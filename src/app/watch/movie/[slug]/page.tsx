import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getIdFromSlug, getYear } from '@/lib/utils';
import CustomPlayer from '@/components/watch/custom-player';
import { getMovieDetails } from '@/services/MovieService/tmdbDetails';

export const revalidate = 3600;

export default async function Page({ params }: { params: { slug: string } }) {
  const id = getIdFromSlug(params.slug);

  let movie = null;
  try {
    movie = await getMovieDetails(id);
  } catch {
    // fallback
  }

  const cast = movie?.credits?.cast?.slice(0, 8) ?? [];
  const similar = movie?.similar?.results?.slice(0, 6) ?? [];

  return (
    <div className="min-h-screen bg-black">
      {/* Player */}
      <div className="relative aspect-video w-full">
        <CustomPlayer mediaId={String(id)} mediaType="movie" title={movie?.title ?? undefined} />
      </div>

      {/* Content below player */}
      {movie && (
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-6 md:flex-row">
            {/* Left: Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                {movie.title}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-400">
                {movie.release_date && <span>{getYear(movie.release_date)}</span>}
                {movie.runtime && (
                  <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                )}
                {movie.vote_average > 0 && (
                  <span className="text-green-400 font-semibold">
                    {Math.round(movie.vote_average * 10)}% Match
                  </span>
                )}
              </div>

              {movie.overview && (
                <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                  {movie.overview}
                </p>
              )}

              {movie.genres && movie.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
              {movie.genres.map((g) => (
                    <span
                      key={g.id}
                      className="rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs text-neutral-400"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Cast */}
            {cast.length > 0 && (
              <div className="md:w-72">
                <h3 className="mb-3 text-sm font-semibold text-neutral-400">Cast</h3>
                <div className="flex flex-wrap gap-4 md:flex-col">
                  {cast.map((person: { id: number; name: string; profile_path: string | null; character: string }) => (
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
                {similar.map((s: { id: number; title: string | null; poster_path: string | null }) => (
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
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-neutral-600">
                          No Poster
                        </div>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-neutral-400 group-hover:text-white">
                      {s.title}
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