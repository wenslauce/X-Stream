import { type Metadata } from 'next';
import { handleMetadata, getIdFromSlug } from '@/lib/utils';
import MovieDetail from '@/components/detail/movie-detail';

type Props = {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return handleMetadata(params.slug, 'movies', 'movie');
}

export default async function Page({ params }: { params: { slug: string } }) {
  const id = getIdFromSlug(params.slug);
  return <MovieDetail id={id} />;
}
