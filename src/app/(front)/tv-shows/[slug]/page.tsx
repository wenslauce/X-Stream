import { type Metadata } from 'next';
import { handleMetadata, getIdFromSlug } from '@/lib/utils';
import TvDetail from '@/components/detail/tv-detail';

type Props = {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return handleMetadata(params.slug, 'tv-shows', 'tv');
}

export default async function Page({ params }: { params: { slug: string } }) {
  const id = getIdFromSlug(params.slug);
  return <TvDetail id={id} />;
}
