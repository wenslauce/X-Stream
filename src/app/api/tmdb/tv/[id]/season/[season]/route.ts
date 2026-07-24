import { NextResponse } from 'next/server';
import tmdbClient from '@/lib/apiClient';
import type { SeasonDetails } from '@/services/MovieService/tmdbDetails';

export async function GET(
  _request: Request,
  { params }: { params: { id: string; season: string } },
) {
  const { id, season } = params;
  try {
    const { data } = await tmdbClient.get<SeasonDetails>(
      `/tv/${id}/season/${season}`,
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch season details' },
      { status: 500 },
    );
  }
}