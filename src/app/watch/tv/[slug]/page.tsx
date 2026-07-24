import React from 'react';
import EmbedPlayer from '@/components/watch/embed-player';

export const revalidate = 3600;

interface SearchParams {
  s?: string;
  e?: string;
}

export default function Page({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SearchParams;
}) {
  const id = params.slug.split('-').pop() ?? '';
  const season = searchParams.s ?? '1';
  const episode = searchParams.e ?? '1';
  return (
    <EmbedPlayer
      mediaId={id}
      mediaType="tv"
      season={season}
      episode={episode}
    />
  );
}
