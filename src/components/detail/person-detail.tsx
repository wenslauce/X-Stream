import Image from 'next/image';
import Link from 'next/link';
import { getPersonDetails, getPersonCombinedCredits } from '@/services/MovieService/tmdbDetails';
import type { PersonDetails, PersonCredit } from '@/services/MovieService/tmdbDetails';
import { getYear } from '@/lib/utils';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getAge(birthday: string | null, deathday: string | null): string {
  if (!birthday) return '';
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  const age = Math.floor((end.getTime() - birth.getTime()) / (365.25 * 86400000));
  return deathday ? ` (${age})` : ` (${age})`;
}

function getSlugFromCredit(credit: PersonCredit): string {
  const name = credit.title ?? credit.name ?? 'unknown';
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${credit.id}`;
}

export default async function PersonDetail({ id }: { id: number }) {
  let person: PersonDetails | null = null;
  let credits: PersonCredit[] = [];

  try {
    [person, credits] = await Promise.all([
      getPersonDetails(id),
      getPersonCombinedCredits(id).then((r) => r.cast),
    ]);
  } catch {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-neutral-400">
        Person not found
      </div>
    );
  }

  // Sort credits by popularity (most popular first), then by date descending
  credits.sort((a, b) => {
    const dateA = a.release_date ?? a.first_air_date ?? '';
    const dateB = b.release_date ?? b.first_air_date ?? '';
    if (dateA && dateB) return dateB.localeCompare(dateA);
    return b.popularity - a.popularity;
  });

  // Remove duplicates by media ID
  const seen = new Set<number>();
  const uniqueCredits = credits.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const knownFor = uniqueCredits.slice(0, 8);
  const filmography = uniqueCredits;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section with backdrop-like gradient */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-20">
          <div className="flex flex-col gap-8 md:flex-row">
            {/* Profile photo */}
            <div className="shrink-0">
              <div className="relative mx-auto h-72 w-48 overflow-hidden rounded-xl shadow-2xl md:h-96 md:w-64">
                {person.profile_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
                    alt={person.name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-neutral-800 text-6xl text-neutral-600">
                    {person.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center gap-4">
              <h1 className="text-4xl font-bold md:text-6xl">{person.name}</h1>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-400">
                {person.known_for_department && (
                  <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-300">
                    {person.known_for_department}
                  </span>
                )}
                {person.birthday && (
                  <span>
                    Born: {formatDate(person.birthday)}
                    {getAge(person.birthday, person.deathday)}
                  </span>
                )}
                {person.deathday && (
                  <span>Died: {formatDate(person.deathday)}</span>
                )}
                {person.place_of_birth && (
                  <span>{person.place_of_birth}</span>
                )}
                {person.popularity > 0 && (
                  <span>
                    {uniqueCredits.length} credits
                  </span>
                )}
              </div>

              {person.biography && (
                <div className="max-w-3xl">
                  <p className="text-sm leading-relaxed text-neutral-300 md:text-base">
                    {person.biography.length > 800
                      ? person.biography.slice(0, 800) + '...'
                      : person.biography}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Known For */}
      {knownFor.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8">
          <h2 className="mb-4 text-xl font-bold">Known For</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
            {knownFor.map((credit) => {
              const title = credit.title ?? credit.name ?? 'Untitled';
              const href =
                credit.media_type === 'movie'
                  ? `/watch/movie/${credit.id}`
                  : `/watch/tv/${credit.id}?s=1&e=1`;
              return (
                <Link key={`${credit.id}-${credit.credit_id}`} href={href} className="group">
                  <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-800">
                    {credit.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${credit.poster_path}`}
                        alt={title}
                        width={200}
                        height={300}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-xs text-neutral-600">
                        {title}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-white">
                    {title}
                  </p>
                  {credit.character && (
                    <p className="truncate text-xs text-neutral-500">
                      as {credit.character}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Filmography */}
      {filmography.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <h2 className="mb-4 text-xl font-bold">Filmography</h2>
          <div className="space-y-1">
            {filmography.map((credit) => {
              const title = credit.title ?? credit.name ?? 'Untitled';
              const year = credit.release_date
                ? getYear(credit.release_date)
                : credit.first_air_date
                  ? getYear(credit.first_air_date)
                  : null;
              const detailHref =
                credit.media_type === 'movie'
                  ? `/movies/${getSlugFromCredit(credit)}`
                  : `/tv-shows/${getSlugFromCredit(credit)}`;
              const watchHref =
                credit.media_type === 'movie'
                  ? `/watch/movie/${credit.id}`
                  : `/watch/tv/${credit.id}?s=1&e=1`;

              return (
                <div
                  key={`${credit.id}-${credit.credit_id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-neutral-900"
                >
                  {/* Small poster */}
                  <Link href={watchHref} className="shrink-0">
                    <div className="h-16 w-11 overflow-hidden rounded bg-neutral-800">
                      {credit.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${credit.poster_path}`}
                          alt={title}
                          width={44}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[8px] text-neutral-600">
                          No Poster
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={detailHref}
                      className="text-sm font-medium text-white hover:underline"
                    >
                      {title}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      {year && <span>{year}</span>}
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase">
                        {credit.media_type === 'movie' ? 'Movie' : 'TV'}
                      </span>
                      {credit.vote_average > 0 && (
                        <span className="text-green-400">
                          {Math.round(credit.vote_average * 10)}%
                        </span>
                      )}
                    </div>
                    {credit.character && (
                      <p className="truncate text-xs text-neutral-500">
                        as {credit.character}
                      </p>
                    )}
                  </div>

                  {/* Watch button */}
                  <Link
                    href={watchHref}
                    className="shrink-0 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                  >
                    Watch
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}