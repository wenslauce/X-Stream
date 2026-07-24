import { type Metadata } from 'next';
import { getIdFromSlug } from '@/lib/utils';
import PersonDetail from '@/components/detail/person-detail';
import { getPersonDetails } from '@/services/MovieService/tmdbDetails';

type Props = {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = getIdFromSlug(params.slug);
  let person = null;
  try {
    person = await getPersonDetails(id);
  } catch {
    // fallback
  }

  return {
    title: person?.name ?? 'Actor',
    description: person?.biography?.slice(0, 160) ?? '',
    openGraph: {
      title: person?.name ?? 'Actor',
      description: person?.biography?.slice(0, 160) ?? '',
      images: person?.profile_path
        ? `https://image.tmdb.org/t/p/original${person.profile_path}`
        : undefined,
    },
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const id = getIdFromSlug(params.slug);
  return <PersonDetail id={id} />;
}