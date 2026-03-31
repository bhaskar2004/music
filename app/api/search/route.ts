import { NextRequest } from 'next/server';
import YouTube from 'youtube-sr';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const results = await YouTube.search(query, {
      limit: 20,
      type: 'video',
    });

    const parsedResults = results.map((video) => ({
      id: video.id,
      title: video.title,
      artist: video.channel?.name || 'Unknown',
      duration: video.duration,
      durationFormatted: video.durationFormatted,
      thumbnail: video.thumbnail?.url || '',
      url: video.url,
    }));

    return new Response(JSON.stringify({ results: parsedResults }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Error fetching search results' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
