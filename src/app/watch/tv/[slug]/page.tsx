import React from 'react';
import { getIdFromSlug } from '@/lib/utils';
import { getTvDetails } from '@/services/MovieService/tmdbDetails';
import TvWatchClient from '@/components/watch/tv-watch-client';

export const revalidate = 3600;

interface SearchParams {
  s?: string;
  e?: string;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SearchParams;
}) {
  const id = getIdFromSlug(params.slug);
  const season = searchParams.s ?? '1';
  const episode = searchParams.e ?? '1';

  let tvData = null;
  try {
    tvData = await getTvDetails(id);
  } catch {
    // fallback
  }

  return (
    <TvWatchClient
      id={id}
      initialData={tvData}
      initialSeason={season}
      initialEpisode={episode}
    />
  );
}