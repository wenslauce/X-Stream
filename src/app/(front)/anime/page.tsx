import Hero from '@/components/hero';
import ShowsContainer from '@/components/shows-container';
import { siteConfig } from '@/configs/site';
import { Genre } from '@/enums/genre';
import { RequestType, type ShowRequest } from '@/enums/request-type';
import MovieService from '@/services/MovieService';
import { MediaType } from '@/types';

export const revalidate = 3600;

export default async function AnimePage() {
  const h1 = `${siteConfig.name} Anime`;
  const requests: ShowRequest[] = [
    {
      title: 'Trending Anime',
      req: { requestType: RequestType.TRENDING, mediaType: MediaType.TV },
      visible: true,
    },
    {
      title: 'Popular Anime',
      req: {
        requestType: RequestType.GENRE,
        mediaType: MediaType.TV,
        genre: Genre.ANIMATION,
      },
      visible: true,
    },
    {
      title: 'Action Anime',
      req: {
        requestType: RequestType.GENRE,
        mediaType: MediaType.TV,
        genre: Genre.ACTION,
      },
      visible: true,
    },
    {
      title: 'Fantasy Anime',
      req: {
        requestType: RequestType.GENRE,
        mediaType: MediaType.TV,
        genre: Genre.FANTASY,
      },
      visible: true,
    },
    {
      title: 'Sci-Fi Anime',
      req: {
        requestType: RequestType.GENRE,
        mediaType: MediaType.TV,
        genre: Genre.SCIENCE_FICTION,
      },
      visible: true,
    },
    {
      title: 'Anime Movies',
      req: {
        requestType: RequestType.GENRE,
        mediaType: MediaType.MOVIE,
        genre: Genre.ANIMATION,
      },
      visible: true,
    },
    {
      title: 'Japanese Anime',
      req: {
        requestType: RequestType.KOREAN,
        mediaType: MediaType.TV,
        genre: Genre.ANIMATION,
      },
      visible: true,
    },
  ];
  const allShows = await MovieService.getShows(requests);

  return (
    <>
      <h1 className="hidden">{h1}</h1>
      <Hero shows={allShows[0].shows} />
      <ShowsContainer shows={allShows} />
    </>
  );
}