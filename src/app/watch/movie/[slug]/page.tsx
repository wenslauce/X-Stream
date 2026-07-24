import React from 'react';
import { getIdFromSlug } from '@/lib/utils';
import EmbedPlayer from '@/components/watch/embed-player';
import { getMovieDetails } from '@/services/MovieService/tmdbDetails';
import Image from 'next/image';
import { getYear } from '@/lib/utils';

export const revalidate = 3600;

export default async function Page({ params }: { params: { slug: string } }) {
  const id = getIdFromSlug(params.slug);

  let movie = null;
  try {
    movie = await getMovieDetails(id);
  } catch {
    // fallback
  }

  return (
    <div className="flex h-screen flex-col bg-black lg:flex-row">
      {/* Player */}
      <div className="relative flex-1">
        <EmbedPlayer mediaId={String(id)} mediaType="movie" />
      </div>

      {/* Sidebar */}
      {movie && (
        <div className="w-full overflow-y-auto border-t border-neutral-800 bg-neutral-950 lg:w-96 lg:border-l lg:border-t-0">
          <div className="p-4">
            <div className="flex gap-3">
              {movie.poster_path && (
                <Image
                  src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                  alt={movie.title ?? ''}
                  width={46}
                  height={69}
                  className="shrink-0 rounded"
                />
              )}
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-white">
                  {movie.title}
                </h1>
                <p className="text-xs text-neutral-400">
                  {movie.release_date && getYear(movie.release_date)}
                  {movie.runtime &&
                    ` • ${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`}
                </p>
              </div>
            </div>

            {movie.overview && (
              <p className="mt-4 text-sm leading-relaxed text-neutral-400">
                {movie.overview}
              </p>
            )}

            {movie.genres && movie.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
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
        </div>
      )}
    </div>
  );
}